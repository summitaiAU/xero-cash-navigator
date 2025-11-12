/**
 * PDF Safe Mode Service
 * 
 * Manages "safe mode" state when PDF rendering causes browser stalls.
 * In safe mode, PDFs are not rendered in iframe - only "Open in Drive" fallback.
 */

class PdfSafeModeService {
  private isEnabled = false;
  private triggerCount = 0;
  private lastTriggerTime = 0;
  private readonly COOLDOWN_PERIOD = 10000; // 10 seconds

  enable(reason: string) {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.triggerCount++;
    this.lastTriggerTime = Date.now();

    console.warn('[PDF Safe Mode] ENABLED', {
      reason,
      triggerCount: this.triggerCount,
    });

    // Auto-disable after cooldown
    setTimeout(() => {
      this.disable();
    }, this.COOLDOWN_PERIOD);
  }

  disable() {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    console.log('[PDF Safe Mode] Disabled');
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  getStats() {
    return {
      isEnabled: this.isEnabled,
      triggerCount: this.triggerCount,
      lastTriggerTime: this.lastTriggerTime,
      timeSinceLastTrigger: Date.now() - this.lastTriggerTime,
    };
  }

  reset() {
    this.isEnabled = false;
    this.triggerCount = 0;
    this.lastTriggerTime = 0;
  }
}

export const pdfSafeModeService = new PdfSafeModeService();
