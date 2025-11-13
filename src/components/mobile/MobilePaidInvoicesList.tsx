import React from 'react';
import { Receipt } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateSydney } from '@/lib/dateUtils';

interface MobilePaidInvoicesListProps {
  invoices: Invoice[];
  loading: boolean;
  onInvoiceClick: (invoiceId: string) => void;
  onClearFilters?: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateShort = (dateString?: string): string => {
  if (!dateString) return '—';
  return formatDateSydney(dateString, 'dd/MM/yy');
};

const getStatusStyles = (status: string): string => {
  const styles: Record<string, string> = {
    'PAID': 'bg-green-50 border-green-200 text-green-700',
    'PARTIALLY PAID': 'bg-amber-50 border-amber-200 text-amber-700',
    'FLAGGED': 'bg-red-50 border-red-200 text-red-700',
    'READY': 'bg-primary/10 border-primary/20 text-primary',
  };
  return styles[status] || 'bg-muted border-border text-foreground';
};

export const MobilePaidInvoicesList: React.FC<MobilePaidInvoicesListProps> = ({
  invoices,
  loading,
  onInvoiceClick,
  onClearFilters,
}) => {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {onClearFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No invoices match your search.'}
          </p>
          {onClearFilters && (
            <Button onClick={onClearFilters} variant="outline">
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-2 py-3 space-y-2"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {invoices.map((invoice) => (
        <button
          key={invoice.id}
          onClick={() => onInvoiceClick(invoice.id)}
          className="w-full bg-card border border-border rounded-xl p-3 text-left hover:bg-muted/50 active:scale-[0.98] transition-all shadow-sm hover:shadow-md relative"
        >
          {/* Row 1: Invoice # + Amount */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-primary">
              {invoice.invoice_number}
            </span>
            <span className="text-sm font-bold tabular-nums">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>

          {/* Row 2: Supplier + Status Badge */}
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-sm text-foreground truncate flex-1">
              {invoice.supplier}
            </span>
            <Badge className={`${getStatusStyles(invoice.status)} text-xs px-2 py-0.5 flex-shrink-0`}>
              {invoice.status}
            </Badge>
          </div>

          {/* Row 3: Entity + Dates */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate flex-1 mr-2">{invoice.entity}</span>
            <span className="whitespace-nowrap flex-shrink-0">
              Paid: {formatDateShort(invoice.paid_date)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
