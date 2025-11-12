/**
 * Runtime Debug Context
 * 
 * Lightweight global state capture for error forensics.
 * Provides a snapshot of viewer state at the moment of any crash or error.
 */

interface RuntimeDebugState {
  route: string;
  viewerOpen: boolean;
  invoiceId?: string;
  currentIndex: number;
  invoiceCount: number;
  loadingPhase: string;
  isNavigating: boolean;
  isInCooldown: boolean;
  lastNavDirection?: 'prev' | 'next';
  lastNavAt?: number;
  requestId: number;
  phaseTiming?: {
    fetchData: number;
    bufferDelay: number;
    pdfMount: number;
    total: number;
  };
}

const defaultState: RuntimeDebugState = {
  route: '',
  viewerOpen: false,
  currentIndex: -1,
  invoiceCount: 0,
  loadingPhase: 'idle',
  isNavigating: false,
  isInCooldown: false,
  requestId: 0,
};

class RuntimeDebugContext {
  private state: RuntimeDebugState = { ...defaultState };

  update(partial: Partial<RuntimeDebugState>) {
    Object.assign(this.state, partial);
  }

  getSnapshot(): Readonly<RuntimeDebugState> {
    return { ...this.state };
  }

  reset() {
    this.state = { ...defaultState };
  }
}

export const runtimeDebugContext = new RuntimeDebugContext();
