import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/invoice';

interface PDFViewerProps {
  invoice: Invoice;
}

export interface PDFViewerHandle {
  abort: () => void;
}

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(({ invoice }, ref) => {
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldMount, setShouldMount] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Expose abort() handle to parent
  useImperativeHandle(ref, () => ({
    abort() {
      try {
        console.info('[PDFViewer] Abort called - unloading iframe');
        if (iframeRef.current) {
          iframeRef.current.src = 'about:blank';
        }
      } finally {
        setShouldMount(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    },
  }));

  // Reset state when invoice changes and delay mounting
  useEffect(() => {
    setPdfError(false);
    setIsLoading(true);
    setShouldMount(false);
    loadStartRef.current = performance.now();
    
    // Delay mounting by 100ms to ensure previous iframe is cleaned up
    const timer = setTimeout(() => setShouldMount(true), 100);
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [invoice.id]);

  // Setup 5s timeout watchdog when iframe mounts
  useEffect(() => {
    if (!shouldMount || pdfError) return;

    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.error('[PDFViewer] Iframe failed to load within 5s timeout', invoice.id);
        setPdfError(true);
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [shouldMount, isLoading, pdfError, invoice.id]);

  // Cleanup previous iframe on invoice change and on unmount to avoid memory leaks
  useEffect(() => {
    const prevFrame = iframeRef.current;
    return () => {
      try {
        if (prevFrame) {
          prevFrame.src = 'about:blank';
        }
      } catch {}
    };
  }, [invoice.id]);

  const handleLoad = () => {
    const elapsed = performance.now() - loadStartRef.current;
    console.info('[PDFViewer] Iframe loaded', { invoiceId: invoice.id, elapsed });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
  };

  const handleError = () => {
    console.error('[PDFViewer] Iframe error', invoice.id);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
        {!pdfError && shouldMount ? (
          <iframe
            key={invoice.id}
            ref={iframeRef}
            src={invoice.drive_embed_url}
            className="w-full h-full"
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
