import React from 'react';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AddInvoiceButton } from './AddInvoiceButton';
import { InvoiceSearch } from './InvoiceSearch';
import { Invoice } from '@/types/invoice';

interface CompactCommandBarProps {
  onRefresh: () => void;
  allInvoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
  onAddInvoice?: () => void;
  loading?: boolean;
}

export const CompactCommandBar: React.FC<CompactCommandBarProps> = ({
  onRefresh,
  allInvoices,
  onInvoiceSelect,
  loading
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card border-b border-border">
      {/* Search Field */}
      <div className="flex-1 min-w-0">
        <InvoiceSearch
          invoices={allInvoices}
          onInvoiceSelect={onInvoiceSelect}
        />
      </div>

      {/* Right-aligned Controls */}
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="hover:bg-muted"
        >
          <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Add Invoice Button */}
        <AddInvoiceButton onSuccess={onRefresh} />
      </div>
    </div>
  );
};
