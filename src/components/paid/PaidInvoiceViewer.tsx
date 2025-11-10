import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { Invoice } from "@/types/invoice";
import { fetchInvoiceById } from "@/services/paidInvoicesService";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

interface PaidInvoiceViewerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceIds?: string[];
  onNavigate?: (invoiceId: string) => void;
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
  invoiceId,
  open,
  onOpenChange,
  invoiceIds = [],
  onNavigate,
}: PaidInvoiceViewerProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

  const currentIndex = invoiceId ? invoiceIds.indexOf(invoiceId) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < invoiceIds.length - 1;

  useEffect(() => {
    if (open && invoiceId) {
      setLoading(true);
      fetchInvoiceById(invoiceId)
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching invoice:", error);
          } else {
            setInvoice(data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setInvoice(null);
    }
  }, [invoiceId, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !onNavigate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canGoPrev) {
        onNavigate(invoiceIds[currentIndex - 1]);
      } else if (e.key === "ArrowRight" && canGoNext) {
        onNavigate(invoiceIds[currentIndex + 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, canGoPrev, canGoNext, invoiceIds, onNavigate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0 data-[state=open]:animate-slide-in-right">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {loading ? (
                <Skeleton className="h-6 w-48" />
              ) : invoice ? (
                <>
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground">
                      {invoice.invoice_no}
                    </h2>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{invoice.supplier_name}</span>
                    <span className="text-border">|</span>
                    <span>Paid: {formatDate(invoice.paid_date)}</span>
                    <span className="text-border">|</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-bold text-foreground">Invoice</h2>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : invoice ? (
            <>
              {/* Left: PDF Preview */}
              <div className="flex-1 bg-muted/30 overflow-auto p-6">
                {invoice.drive_embed_url ? (
                  <PDFViewer invoice={invoice} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>

              {/* Right: Metadata */}
              <div className="w-[420px] bg-muted/50 overflow-auto p-6 border-l border-border">
                <XeroSection
                  invoice={invoice}
                  onUpdate={() => {}}
                  onSync={() => {}}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              No invoice selected
            </div>
          )}
        </div>

        {/* Footer with Navigation Hints */}
        {invoice && invoiceIds.length > 0 && (
          <div className="sticky bottom-0 px-6 py-3 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => canGoPrev && onNavigate?.(invoiceIds[currentIndex - 1])}
                disabled={!canGoPrev}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => canGoNext && onNavigate?.(invoiceIds[currentIndex + 1])}
                disabled={!canGoNext}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs">←</kbd>
                <span>Previous</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs">→</kbd>
                <span>Next</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs">ESC</kbd>
                <span>Close</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Invoice {currentIndex + 1} of {invoiceIds.length}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
