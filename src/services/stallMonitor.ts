/**
 * Stall Monitor Service
 * 
 * Detects main-thread blocking (event loop lag) and memory issues
 * to prevent browser freezes during PDF navigation.
 */

interface StallMetrics {
  eventLoopLag: number;
  memoryUsed?: number;
  memoryLimit?: number;
  timestamp: number;
}

interface StallCallback {
  onStallDetected: (metrics: StallMetrics) => void;
  onRecovery?: () => void;
}

class StallMonitor {
  private isMonitoring = false;
  private rafId: number | null = null;
  private lastTickTime = 0;
  private callbacks: StallCallback[] = [];
  private stallCount = 0;
  private readonly LAG_THRESHOLD = 100; // ms - stall if tick takes >100ms
  private readonly CRITICAL_LAG_THRESHOLD = 300; // ms - critical stall
  private readonly MEMORY_THRESHOLD = 0.9; // 90% of heap limit
  private isInStall = false;

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTickTime = performance.now();
    this.tick();
    
    console.log('[StallMonitor] Started monitoring');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    console.log('[StallMonitor] Stopped monitoring');
  }

  subscribe(callback: StallCallback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private tick = () => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const lag = now - this.lastTickTime;
    this.lastTickTime = now;

    // Skip first tick (no baseline)
    if (lag > 1000) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    // Check memory
    const memory = (performance as any).memory;
    const memoryUsed = memory?.usedJSHeapSize;
    const memoryLimit = memory?.jsHeapSizeLimit;
    const memoryPressure = memoryLimit ? memoryUsed / memoryLimit : 0;

    const metrics: StallMetrics = {
      eventLoopLag: lag,
      memoryUsed,
      memoryLimit,
      timestamp: now,
    };

    // Detect stall
    const isCriticalLag = lag > this.CRITICAL_LAG_THRESHOLD;
    const isHighMemory = memoryPressure > this.MEMORY_THRESHOLD;
    const isStalling = lag > this.LAG_THRESHOLD || isHighMemory;

    if (isStalling && !this.isInStall) {
      // Entering stall state
      this.isInStall = true;
      this.stallCount++;
      
      console.warn('[StallMonitor] Stall detected!', {
        lag: `${lag.toFixed(0)}ms`,
        memory: memory ? `${(memoryUsed / 1024 / 1024).toFixed(0)}MB / ${(memoryLimit / 1024 / 1024).toFixed(0)}MB` : 'N/A',
        stallCount: this.stallCount,
        critical: isCriticalLag,
      });

      // Notify callbacks
      this.callbacks.forEach(cb => cb.onStallDetected(metrics));
    } else if (!isStalling && this.isInStall) {
      // Recovering from stall
      this.isInStall = false;
      
      console.log('[StallMonitor] Recovered from stall');
      
      this.callbacks.forEach(cb => cb.onRecovery?.());
    }

    // Continue monitoring
    this.rafId = requestAnimationFrame(this.tick);
  };

  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      stallCount: this.stallCount,
      isInStall: this.isInStall,
    };
  }

  reset() {
    this.stallCount = 0;
    this.isInStall = false;
  }
}

export const stallMonitor = new StallMonitor();
