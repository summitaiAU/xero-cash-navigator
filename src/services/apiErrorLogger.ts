import { auditService } from './auditService';

export interface ApiCallLog {
  endpoint: string;
  method: string;
  requestData?: any;
  invoiceNumber?: string;
  userContext?: string;
}

export class ApiErrorLogger {
  // Central logging method for all API errors
  static async logError({
    endpoint,
    method,
    requestData,
    invoiceNumber,
    userContext,
    error,
    response,
    responseData
  }: ApiCallLog & {
    error?: Error | any;
    response?: Response;
    responseData?: any;
  }) {
    const errorDetails = {
      api_endpoint: `${method} ${endpoint}`,
      error_message: error?.message || 'Unknown API error',
      error_details: {
        user_context: userContext,
        error_type: error?.name,
        error_stack: error?.stack,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      request_data: {
        ...requestData,
        invoice_number: invoiceNumber
      },
      response_status: response?.status,
      response_data: typeof responseData === 'string' 
        ? responseData.substring(0, 1000) // Limit response data size
        : JSON.stringify(responseData || {}).substring(0, 1000),
      invoice_number: invoiceNumber
    };

    await auditService.logApiError(errorDetails);
  }

  // Helper method to wrap fetch calls with automatic error logging
  static async fetchWithLogging(
    url: string, 
    options: RequestInit & { 
      logContext?: ApiCallLog;
      expectJson?: boolean;
    } = {}
  ): Promise<Response> {
    const { logContext, expectJson = true, ...fetchOptions } = options;
    
    try {
      console.log(`API Call: ${fetchOptions.method || 'GET'} ${url}`, {
        context: logContext?.userContext,
        invoice: logContext?.invoiceNumber
      });

      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        let responseData: any = null;
        try {
          responseData = expectJson ? await response.clone().json() : await response.clone().text();
        } catch (parseError) {
          responseData = 'Failed to parse response';
        }

        await this.logError({
          endpoint: url,
          method: fetchOptions.method || 'GET',
          requestData: logContext?.requestData,
          invoiceNumber: logContext?.invoiceNumber,
          userContext: logContext?.userContext || 'Unknown',
          error: new Error(`HTTP ${response.status}: ${response.statusText}`),
          response,
          responseData
        });

        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      console.log(`API Success: ${fetchOptions.method || 'GET'} ${url}`, {
        status: response.status,
        context: logContext?.userContext,
        invoice: logContext?.invoiceNumber
      });

      return response;
    } catch (error) {
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        // Only log if it's not a network error already logged above
        await this.logError({
          endpoint: url,
          method: fetchOptions.method || 'GET',
          requestData: logContext?.requestData,
          invoiceNumber: logContext?.invoiceNumber,
          userContext: logContext?.userContext || 'Unknown',
          error
        });
      }
      
      console.error(`API Error: ${fetchOptions.method || 'GET'} ${url}`, error);
      throw error;
    }
  }

  // Helper for Supabase operations
  static async logSupabaseError(
    operation: string,
    error: any,
    context?: {
      table?: string;
      invoiceId?: string;
      invoiceNumber?: string;
      userContext?: string;
    }
  ) {
    await this.logError({
      endpoint: `supabase/${context?.table || 'unknown'}`,
      method: operation.toUpperCase(),
      requestData: {
        table: context?.table,
        invoice_id: context?.invoiceId
      },
      invoiceNumber: context?.invoiceNumber,
      userContext: context?.userContext || 'Supabase Operation',
      error: typeof error === 'string' ? new Error(error) : error
    });
  }
}