import React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { Invoice } from "@/types/invoice";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

interface PaidInvoiceViewerProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLockedByOther?: boolean;
  lockedByUser?: string;
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

const getStatusBadge = (status: string, invoice: Invoice, isLockedByOther?: boolean, lockedByUser?: string) => {
  const statusConfig: Record<string, { bg: string; border: string; text: string }> = {
    PAID: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    "PARTIALLY PAID": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    FLAGGED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
    READY: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" },
  };

  const config = statusConfig[status] || { bg: "bg-muted", border: "border-border", text: "text-foreground" };

  const getTooltipContent = () => {
    if (status === "PAID") {
      return `Paid ${formatCurrency(invoice.amount_paid || invoice.total_amount)} on ${formatDate(invoice.paid_date)}`;
    }
    if (status === "PARTIALLY PAID") {
      return `Partially paid ${formatCurrency(invoice.amount_paid || 0)} on ${formatDate(invoice.paid_date)}`;
    }
    return status;
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.text}`}>
              {status}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isLockedByOther && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-amber-600">
                <Lock className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Being edited by {lockedByUser}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export function PaidInvoiceViewer({
  invoice,
  open,
  onOpenChange,
  isLockedByOther,
  lockedByUser,
}: PaidInvoiceViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
        <ErrorBoundary>
          {invoice ? (
            <>
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-0.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold leading-none truncate">
                        Invoice {invoice.invoice_number}
                      </h2>
                      <span className="text-xl font-semibold leading-none text-gray-800">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                      {getStatusBadge(invoice.status, invoice, isLockedByOther, lockedByUser)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 leading-tight">
                      <span className="truncate">{invoice.supplier}</span>
                      <span>•</span>
                      <span>Issued: {formatDate(invoice.invoice_date)}</span>
                      <span>•</span>
                      <span>Paid: {formatDate(invoice.paid_date)}</span>
                    </div>
                  </div>
                </div>
                <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                  {/* Left: PDF Preview */}
                  <ResizablePanel defaultSize={52} minSize={40} className="bg-muted/30">
                    <div className="h-full overflow-auto px-3 py-2">
                      {invoice.drive_embed_url ? (
                        <PDFViewer invoice={invoice} key={invoice.id} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No preview available
                        </div>
                      )}
                    </div>
                  </ResizablePanel>

                  {/* Divider */}
                  <ResizableHandle className="w-px bg-border hover:bg-primary/50 transition-colors" />

                  {/* Right: Xero Details */}
                  <ResizablePanel defaultSize={48} minSize={35} className="bg-background">
                    <div className="h-full overflow-auto px-3 py-2">
                      <XeroSection 
                        invoice={invoice} 
                        onUpdate={() => {}} 
                        onSync={() => {}}
                        disablePresence={true}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
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
