import { ApiErrorLogger } from './apiErrorLogger';

const XERO_WEBHOOK = 'https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e';

const getXeroData = async (xeroInvoiceId: string) => {
  const response = await ApiErrorLogger.fetchWithLogging(XERO_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ xero_invoice_id: xeroInvoiceId }),
    logContext: {
      endpoint: XERO_WEBHOOK,
      method: 'POST',
      requestData: { xero_invoice_id: xeroInvoiceId },
      userContext: 'Fetch Xero invoice data'
    }
  });
  
  return response.json();
};

export const invoiceService = {
  getXeroData: (xeroInvoiceId: string) => getXeroData(xeroInvoiceId),
};