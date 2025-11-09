import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFViewer } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { Invoice } from "@/types/invoice";
import { fetchInvoiceById } from "@/services/paidInvoicesService";

interface PaidInvoiceViewerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaidInvoiceViewer({
  invoiceId,
  open,
  onOpenChange,
}: PaidInvoiceViewerProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {loading
                ? "Loading invoice..."
                : invoice
                ? `Invoice ${invoice.invoice_no}`
                : "Invoice"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : invoice ? (
            <>
              {/* Left: PDF Preview */}
              <div className="flex-1 border-r overflow-auto p-6">
                {invoice.drive_embed_url ? (
                  <PDFViewer invoice={invoice} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>

              {/* Right: Invoice Metadata */}
              <div className="w-96 overflow-auto p-6">
                <XeroSection
                  invoice={invoice}
                  onUpdate={() => {
                    // Read-only view - no updates
                  }}
                  onSync={() => {
                    // Read-only view - no sync
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              No invoice selected
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
