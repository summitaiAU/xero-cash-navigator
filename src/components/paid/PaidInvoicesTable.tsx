import React from "react";
import { ChevronLeft, ChevronRight, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/types/invoice";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

interface PaidInvoicesTableProps {
  invoices: Invoice[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onInvoiceClick: (invoiceId: string) => void;
  isChangingPage?: boolean;
  onClearFilters?: () => void;
  onSupplierClick?: (supplier: string) => void;
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
  const statusConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    PAID: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "✓" },
    "PARTIALLY_PAID": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "⊕" },
    FLAGGED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "!" },
    READY: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary", icon: "→" },
  };

  const config = statusConfig[status] || { bg: "bg-muted", border: "border-border", text: "text-foreground", icon: "" };

  return (
    <Badge className={`px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.text}`}>
      {config.icon} {status}
    </Badge>
  );
};

const ShimmerSkeleton = () => (
  <div className="h-12 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer rounded-lg" />
);

export const PaidInvoicesTable = React.memo(function PaidInvoicesTable({
  invoices,
  loading,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onInvoiceClick,
  isChangingPage = false,
  onClearFilters,
  onSupplierClick,
}: PaidInvoicesTableProps) {
  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalCount);

  if (loading && invoices.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <ShimmerSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && invoices.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No paid invoices yet
          </h3>
          
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Payments will appear here once invoices are processed and marked as paid.
            {onClearFilters && " Try adjusting your filters."}
          </p>
          
          {onClearFilters && (
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="rounded-lg border-border"
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      {/* Pagination Loading Overlay */}
      {isChangingPage && (
        <div className="absolute inset-0 bg-card/70 backdrop-blur-[2px] flex items-center justify-center z-30 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Table noContainer className="table-fixed">
          <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm border-b-2 border-border z-10">
            <TableRow>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Invoice #
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Supplier
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Entity
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">
                Invoice Date
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">
                Date Paid
              </TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer border-b border-border/50 hover:bg-muted/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:scale-[1.002] hover:z-10 transition-all duration-200"
                onClick={() => onInvoiceClick(invoice.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInvoiceClick(invoice.id);
                }}
              >
                <TableCell className="px-4 py-5">
                  <button 
                    className="font-semibold text-[15px] text-blue hover:text-blue-hover hover:underline underline-offset-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInvoiceClick(invoice.id);
                    }}
                  >
                    {invoice.invoice_no || "—"}
                  </button>
                </TableCell>
                <TableCell className="px-4 py-5">
                  {getStatusBadge(invoice.status)}
                </TableCell>
                <TableCell className="px-4 py-5 truncate">
                  {invoice.supplier_name ? (
                    <button
                      className="font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors truncate max-w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSupplierClick?.(invoice.supplier_name!);
                      }}
                    >
                      {invoice.supplier_name}
                    </button>
                  ) : (
                    <span className="font-semibold text-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-5 text-sm text-muted-foreground">
                  {invoice.entity || "—"}
                </TableCell>
                <TableCell className="px-4 py-5 text-right text-sm text-muted-foreground tabular-nums">
                  {formatDate(invoice.invoice_date)}
                </TableCell>
                <TableCell className="px-4 py-5 text-right text-sm text-muted-foreground tabular-nums">
                  {formatDate(invoice.paid_date)}
                </TableCell>
                <TableCell className="px-4 py-5 text-right font-semibold text-foreground tabular-nums">
                  {formatCurrency(invoice.total_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 z-20 border-t bg-card p-4 flex items-center justify-between shadow-soft">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {totalCount} invoices
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage + 1} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="rounded-lg"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
