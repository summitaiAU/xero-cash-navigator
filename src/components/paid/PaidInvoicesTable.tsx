import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/types/invoice";

interface PaidInvoicesTableProps {
  invoices: Invoice[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onInvoiceClick: (invoiceId: string) => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PAID: "default",
    "PARTIALLY PAID": "secondary",
    FLAGGED: "destructive",
    READY: "outline",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {status}
    </Badge>
  );
};

export function PaidInvoicesTable({
  invoices,
  loading,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onInvoiceClick,
}: PaidInvoicesTableProps) {
  const startIndex = currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalCount);

  if (loading && invoices.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && invoices.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">
            No paid invoices found
          </p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search query
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[180px]">Invoice Number</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[200px]">Supplier</TableHead>
              <TableHead className="w-[150px]">Entity</TableHead>
              <TableHead className="w-[120px]">Invoice Date</TableHead>
              <TableHead className="w-[120px]">Date Paid</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice, index) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onInvoiceClick(invoice.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInvoiceClick(invoice.id);
                }}
              >
                <TableCell className="font-medium">
                  {invoice.invoice_no || "—"}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {invoice.supplier_name || "—"}
                </TableCell>
                <TableCell>{invoice.entity || "—"}</TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{formatDate(invoice.payment_made_at)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.total_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="border-t bg-background p-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {totalCount} invoices
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
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
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
