import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/invoice';

interface PDFViewerProps {
  invoice: Invoice;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ invoice }) => {
  const [pdfError, setPdfError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when invoice changes
  useEffect(() => {
    setPdfError(false);
    setIsLoading(true);
  }, [invoice.id]);

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
        {!pdfError ? (
          <iframe
            src={invoice.drive_embed_url}
            className="w-full h-full"
            frameBorder="0"
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setPdfError(true);
              setIsLoading(false);
            }}
            title={`Invoice ${invoice.invoice_number}`}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
};