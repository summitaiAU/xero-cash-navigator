import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/invoice';

const PDF_MOUNT_DELAY_MS = 150;

interface PDFViewerProps {
  invoice: Invoice;
}

export interface PDFViewerHandle {
  abort: () => void;
}

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ invoice }, ref) => {
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mountInvoiceId, setMountInvoiceId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const invoiceIdRef = useRef(invoice.id);
  const loadStartRef = useRef<number>(0);
  const mountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  invoiceIdRef.current = invoice.id;

  const clearTimer = useCallback((timerRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const unloadIframe = useCallback(() => {
    try {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    } catch {
      // Safari may throw while tearing down embedded PDF frames.
    }
  }, []);

  // Expose abort() handle to parent
  useImperativeHandle(ref, () => ({
    abort() {
      try {
        console.info('[PDFViewer] Abort called - unloading iframe');
        unloadIframe();
      } finally {
        clearTimer(mountTimerRef);
        clearTimer(timeoutRef);
        setMountInvoiceId(null);
        setPdfError(false);
        setIsLoading(false);
      }
    },
  }), [clearTimer, unloadIframe]);

  // Reset state when invoice changes and delay mounting until the old iframe is gone.
  useEffect(() => {
    clearTimer(mountTimerRef);
    clearTimer(timeoutRef);
    unloadIframe();
    setPdfError(false);
    setIsLoading(true);
    setMountInvoiceId(null);
    loadStartRef.current = performance.now();
    
    mountTimerRef.current = setTimeout(() => {
      if (invoiceIdRef.current === invoice.id) {
        loadStartRef.current = performance.now();
        setMountInvoiceId(invoice.id);
      }
      mountTimerRef.current = null;
    }, PDF_MOUNT_DELAY_MS);

    return () => {
      clearTimer(mountTimerRef);
      clearTimer(timeoutRef);
      unloadIframe();
    };
  }, [clearTimer, invoice.id, unloadIframe]);

  // Setup 5s timeout watchdog when iframe mounts
  useEffect(() => {
    if (mountInvoiceId !== invoice.id || pdfError) return;

    timeoutRef.current = setTimeout(() => {
      console.error('[PDFViewer] Iframe failed to load within 5s timeout', invoice.id);
      setPdfError(true);
      setIsLoading(false);
      setMountInvoiceId(null);
    }, 5000);

    return () => {
      clearTimer(timeoutRef);
    };
  }, [clearTimer, mountInvoiceId, pdfError, invoice.id]);

  const handleLoad = () => {
    if (mountInvoiceId !== invoice.id) return;
    const elapsed = performance.now() - loadStartRef.current;
    console.info('[PDFViewer] Iframe loaded', { invoiceId: invoice.id, elapsed });
    clearTimer(timeoutRef);
    setIsLoading(false);
  };

  const handleError = () => {
    console.error('[PDFViewer] Iframe error', invoice.id);
    clearTimer(timeoutRef);
    setPdfError(true);
    setIsLoading(false);
  };

  return (
    <div className="dashboard-card p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50 text-sm text-muted-foreground">
        <span>Invoice: {invoice.invoice_number}</span>
        <span>{invoice.supplier}</span>
      </div>

      <div className="flex-1 relative bg-pdf-bg rounded-lg border border-border overflow-hidden">
        {isLoading && !pdfError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {!pdfError && mountInvoiceId === invoice.id ? (
          <iframe
            key={mountInvoiceId}
            ref={iframeRef}
            src={invoice.drive_embed_url}
            className="w-full h-full border border-gray-200 rounded-xl shadow-md bg-white"
            frameBorder="0"
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
            title={`Invoice ${invoice.invoice_number}`}
          />
        ) : pdfError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <AlertTriangle className="h-12 w-12 text-warning mb-4" />
            <h4 className="text-lg font-medium mb-2">Unable to display PDF</h4>
            <p className="text-muted-foreground mb-6">
              The PDF preview could not be loaded. You can still view it in a new tab.
            </p>
            <Button onClick={() => window.open(invoice.drive_view_url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open PDF in New Tab
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
});
