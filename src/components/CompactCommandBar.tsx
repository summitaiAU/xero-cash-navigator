import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AddInvoiceButton } from './AddInvoiceButton';
import { InvoiceDropdown } from './InvoiceDropdown';
import { Invoice } from '@/types/invoice';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompactCommandBarProps {
  onRefresh: () => void;
  allInvoices: Invoice[];
  visibleInvoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
  currentInvoice: Invoice | null;
  onAddInvoice?: () => void;
  loading?: boolean;
  // Navigation props
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
}

export const CompactCommandBar: React.FC<CompactCommandBarProps> = ({
  onRefresh,
  allInvoices,
  visibleInvoices,
  onInvoiceSelect,
  currentInvoice,
  loading,
  currentIndex = 0,
  totalCount = 0,
  onPrevious,
  onNext,
  canGoBack = false,
  canGoNext = false,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(allInvoices);

  // Filter invoices based on search value
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredInvoices(allInvoices);
      return;
    }

    const searchTerm = searchValue.toLowerCase().trim();
    
    const filtered = allInvoices.filter(invoice => {
      if (invoice.status === 'DELETED') return false;

      const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
      const supplier = invoice.supplier?.toLowerCase() || '';
      
      const normalizeInvoiceNumber = (num: string) => {
        return num.replace(/^inv/i, '');
      };
      
      const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
      const normalizedSearchTerm = normalizeInvoiceNumber(searchTerm);
      
      const matchesInvoiceNumber = 
        invoiceNumber.includes(searchTerm) ||
        normalizedInvoiceNumber.includes(normalizedSearchTerm) ||
        (`inv${normalizedInvoiceNumber}`).includes(searchTerm);
      
      const matchesSupplier = supplier.includes(searchTerm);
      
      return matchesInvoiceNumber || matchesSupplier;
    });

    setFilteredInvoices(filtered);
  }, [searchValue, allInvoices]);

  return (
    <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card border-b border-border">
      {/* Search Field with Results Dropdown */}
      <div className="flex-1 min-w-0 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="Search invoices…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 h-9 bg-background"
        />
        
        {/* Search Results Dropdown */}
        {searchValue.trim() && filteredInvoices.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto z-50">
            {filteredInvoices.slice(0, 10).map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => {
                  onInvoiceSelect(invoice);
                  setSearchValue('');
                }}
                className="w-full flex items-center justify-between gap-3 py-2 px-3 hover:bg-muted text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-medium text-sm whitespace-nowrap">
                    {invoice.invoice_number}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {invoice.supplier}
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(invoice.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
        
        {/* No Results Message */}
        {searchValue.trim() && filteredInvoices.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg py-3 px-4 z-50">
            <p className="text-sm text-muted-foreground">No invoices found</p>
          </div>
        )}
      </div>

      {/* Right-aligned Controls */}
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh invoice list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Add Invoice Button */}
        <AddInvoiceButton onSuccess={onRefresh} />

        {/* Divider */}
        {onPrevious && onNext && (
          <div className="hidden sm:block h-6 w-px bg-border mx-1" />
        )}

        {/* Navigation Controls */}
        {onPrevious && onNext && (
          <div className="flex items-center gap-2">
            {/* Invoice Dropdown */}
            <InvoiceDropdown
              invoices={visibleInvoices}
              currentInvoice={currentInvoice}
              onInvoiceSelect={onInvoiceSelect}
            />

            {/* Divider */}
            <div className="h-6 w-px bg-border" />

            {/* Previous Button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!canGoBack}
                    className="h-8 w-8 p-0 hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Previous (Shift + J or ←)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Counter */}
            <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
              {totalCount > 0 ? `${currentIndex + 1} of ${totalCount}` : '0 of 0'}
            </span>

            {/* Next Button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNext}
                    disabled={!canGoNext}
                    className="h-8 w-8 p-0 hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next (Shift + K or →)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};
