import React, { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFViewer, PDFViewerHandle } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { Invoice } from "@/types/invoice";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { telemetry } from "@/services/telemetry";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { runtimeDebugContext } from "@/services/runtimeDebugContext";

interface PaidInvoiceViewerProps {
  invoices: Invoice[];
  currentIndex: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (direction: 'next' | 'prev') => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const sydneyTime = toZonedTime(new Date(dateString), "Australia/Sydney");
  return format(sydneyTime, "dd/MM/yyyy");
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string; border: string; text: string }> = {
    PAID: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    "PARTIALLY PAID": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    FLAGGED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
    READY: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" },
  };

  const config = statusConfig[status] || { bg: "bg-muted", border: "border-border", text: "text-foreground" };

  return (
    <Badge className={`px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.text}`}>
      {status}
    </Badge>
  );
};

export function PaidInvoiceViewer({
  invoices,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: PaidInvoiceViewerProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  
  const pdfRef = useRef<PDFViewerHandle>(null);

  // Derive current invoice from props
  const invoice = currentIndex !== null && currentIndex >= 0 && currentIndex < invoices.length
    ? invoices[currentIndex]
    : null;

  const canGoPrev = currentIndex !== null && currentIndex > 0;
  const canGoNext = currentIndex !== null && currentIndex < invoices.length - 1;

  // Update runtime context when viewer state changes
  useEffect(() => {
    if (open && invoice) {
      runtimeDebugContext.update({
        route: window.location.pathname,
        viewerOpen: true,
        invoiceId: invoice.id,
        currentIndex,
        invoiceCount: invoices.length,
      });
    } else {
      runtimeDebugContext.update({
        viewerOpen: false,
        invoiceId: null,
        currentIndex: null,
      });
    }
  }, [open, invoice, currentIndex, invoices.length]);

  // Simplified navigation handler
  const handleNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (isNavigating) return;
      
      setIsNavigating(true);
      runtimeDebugContext.update({ 
        lastNavDirection: direction, 
        lastNavAt: Date.now(),
        isNavigating: true,
      });

      telemetry.logUIEvent("invoice_navigation", { direction, currentIndex });
      onNavigate(direction);
      
      // Reset navigation flag after a short delay
      setTimeout(() => {
        setIsNavigating(false);
        runtimeDebugContext.update({ isNavigating: false });
      }, 200);
    },
    [isNavigating, onNavigate, currentIndex]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runtimeDebugContext.update({
        viewerOpen: false,
        invoiceId: null,
        currentIndex: null,
      });
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
        <ErrorBoundary>
          {invoice ? (
            <>
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold truncate">
                        Invoice {invoice.invoice_number}
                      </h2>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="truncate">{invoice.supplier}</span>
                      <span>•</span>
                      <span>Issued: {formatDate(invoice.invoice_date)}</span>
                      <span>•</span>
                      <span>Paid: {formatDate(invoice.paid_date)}</span>
                      <span>•</span>
                      <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                </div>
                <DialogClose />
              </div>

              {/* Content Area */}
              <div className="flex-1 flex overflow-hidden">
                <>
                  {/* Left: PDF Preview */}
                  <div className="flex-1 bg-muted/30 overflow-auto p-6">
                    {invoice.drive_embed_url ? (
                      <PDFViewer ref={pdfRef} invoice={invoice} key={invoice.id} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No preview available
                      </div>
                    )}
                  </div>

                  {/* Right: Xero Details */}
                  <div className="w-[420px] bg-background border-l overflow-auto">
                    <XeroSection 
                      invoice={invoice} 
                      onUpdate={() => {}} 
                      onSync={() => {}} 
                    />
                  </div>
                </>
              </div>

              {/* Footer Navigation */}
              <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('prev')}
                  disabled={!canGoPrev || isNavigating}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {currentIndex !== null ? currentIndex + 1 : 0} / {invoices.length}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate('next')}
                  disabled={!canGoNext || isNavigating}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No invoice selected</p>
            </div>
          )}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
