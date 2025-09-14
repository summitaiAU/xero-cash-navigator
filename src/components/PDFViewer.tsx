import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, Maximize, ExternalLink, AlertTriangle } from 'lucide-react';
import { Invoice } from '@/types/invoice';

interface PDFViewerProps {
  invoice: Invoice;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ invoice }) => {
  const [pdfError, setPdfError] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = invoice.drive_view_url;
    link.target = '_blank';
    link.click();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handleFullscreen = () => {
    window.open(invoice.drive_view_url, '_blank');
  };

  return (
    <div className="dashboard-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-header mb-0">Invoice PDF</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(invoice.drive_view_url, '_blank')}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-pdf-bg rounded-lg border border-border overflow-hidden">
        {!pdfError ? (
          <iframe
            src={invoice.drive_embed_url}
            className="w-full h-full"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (zoom / 100)}%`,
              height: `${100 / (zoom / 100)}%`
            }}
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