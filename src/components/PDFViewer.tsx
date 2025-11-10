import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/invoice';

interface PDFViewerProps {
  invoice: Invoice;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ invoice }) => {
  const [pdfError, setPdfError] = useState(false);

  // Reset error when invoice changes
  useEffect(() => {
    setPdfError(false);
  }, [invoice.id]);

  return (
    <div className="dashboard-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">Invoice PDF</h3>
      </div>

      <div className="flex-1 relative bg-pdf-bg rounded-lg border border-border overflow-hidden">
        {!pdfError ? (
          <iframe
            src={invoice.drive_embed_url}
            className="w-full h-full"
            frameBorder="0"
            loading="lazy"
            onError={() => setPdfError(true)}
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

      <div className="mt-4 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Invoice: {invoice.invoice_number}</span>
          <span>{invoice.supplier}</span>
        </div>
      </div>
    </div>
  );
};