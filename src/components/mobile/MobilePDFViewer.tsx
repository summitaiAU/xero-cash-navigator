import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/invoice';

interface MobilePDFViewerProps {
  invoice: Invoice;
}

export const MobilePDFViewer = ({ invoice }: MobilePDFViewerProps) => {
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // PDF.js integration would be needed for actual page count
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setPdfError(false);
    setIsLoading(true);
    setCurrentPage(1);
  }, [invoice.id]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setPdfError(true);
    setIsLoading(false);
  };

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="absolute inset-0 px-2">
        {isLoading && !pdfError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {!pdfError ? (
          <>
            <iframe
              key={invoice.id}
              ref={iframeRef}
              src={invoice.drive_embed_url}
              className="w-full h-full rounded-lg shadow-md bg-white border border-border"
              frameBorder="0"
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              title={`Invoice ${invoice.invoice_number}`}
            />
            
            {/* Page Controls Overlay */}
            {!isLoading && totalPages > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="text-white text-xs font-medium min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-card rounded-lg border border-border">
            <AlertTriangle className="h-12 w-12 text-warning mb-4" />
            <h4 className="text-lg font-medium mb-2">Unable to display PDF</h4>
            <p className="text-muted-foreground mb-6 text-sm">
              The PDF preview could not be loaded. You can still view it in a new tab.
            </p>
            <Button onClick={() => window.open(invoice.drive_view_url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open PDF in New Tab
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
