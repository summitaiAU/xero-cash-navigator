import { auditService } from './auditService';

interface TelemetryEvent {
  name: string;
  payload: Record<string, any>;
  route?: string;
}

class TelemetryService {
  private isDev = import.meta.env.DEV;

  /**
   * Log UI events (user interactions, state changes)
   */
  async logUIEvent(name: string, payload: Record<string, any> = {}): Promise<void> {
    const event: TelemetryEvent = {
      name,
      payload,
      route: window.location.pathname,
    };

    if (this.isDev) {
      console.info(`[Telemetry UI] ${name}`, payload);
    }

    // Log to audit system
    try {
      await auditService.logApiError({
        api_endpoint: `ui/${name}`,
        error_message: name,
        error_details: {
          ...payload,
          route: window.location.pathname,
          timestamp: Date.now(),
        },
        response_status: 0,
      });
    } catch (err) {
      console.error('[Telemetry] Failed to log UI event:', err);
    }
  }

  /**
   * Log performance metrics (timing, duration)
   */
  async logPerf(name: string, payload: Record<string, any> = {}): Promise<void> {
    const event: TelemetryEvent = {
      name,
      payload,
      route: window.location.pathname,
    };

    if (this.isDev) {
      console.info(`[Telemetry Perf] ${name}`, payload);
    }

    // Log to audit system
    try {
      await auditService.logApiError({
        api_endpoint: `perf/${name}`,
        error_message: name,
        error_details: {
          ...payload,
          route: window.location.pathname,
          timestamp: Date.now(),
        },
        response_status: 0,
      });
    } catch (err) {
      console.error('[Telemetry] Failed to log perf metric:', err);
    }
  }

  /**
   * Log errors with context
   */
  async logError(name: string, error: Error | any, payload: Record<string, any> = {}): Promise<void> {
    const event: TelemetryEvent = {
      name,
      payload: {
        ...payload,
        error: error?.message || String(error),
        stack: error?.stack,
      },
      route: window.location.pathname,
    };

    console.error(`[Telemetry Error] ${name}`, error, payload);

    // Log to audit system
    try {
      await auditService.logApiError({
        api_endpoint: `error/${name}`,
        error_message: error?.message || String(error),
        error_details: {
          ...payload,
          stack: error?.stack,
          route: window.location.pathname,
          timestamp: Date.now(),
        },
        response_status: 0,
      });
    } catch (err) {
      console.error('[Telemetry] Failed to log error:', err);
    }
  }
}

export const telemetry = new TelemetryService();
