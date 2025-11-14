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
    if (this.isDev) {
      console.info(`[Telemetry UI] ${name}`, payload);
    }
    // Telemetry is for development debugging only - not logged to database
  }

  /**
   * Log performance metrics (timing, duration)
   */
  async logPerf(name: string, payload: Record<string, any> = {}): Promise<void> {
    if (this.isDev) {
      console.info(`[Telemetry Perf] ${name}`, payload);
    }
    // Telemetry is for development debugging only - not logged to database
  }

  /**
   * Log errors with context
   */
  async logError(name: string, error: Error | any, payload: Record<string, any> = {}): Promise<void> {
    console.error(`[Telemetry Error] ${name}`, error, payload);
    // Telemetry is for development debugging only - not logged to database
    // Consider integrating external error tracking service (Sentry, etc.) here if needed
  }
}

export const telemetry = new TelemetryService();
