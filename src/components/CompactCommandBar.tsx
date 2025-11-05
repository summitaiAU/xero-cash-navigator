import React from 'react';
import { RefreshCw, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AddInvoiceButton } from './AddInvoiceButton';
import { InvoiceSearch } from './InvoiceSearch';
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
  onInvoiceSelect: (invoice: Invoice) => void;
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
  onInvoiceSelect,
  loading,
  currentIndex = 0,
  totalCount = 0,
  onPrevious,
  onNext,
  canGoBack = false,
  canGoNext = false,
}) => {
  return (
    <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-card border-b border-border">
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
            {/* Previous Button */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!canGoBack}
                    className="hover:bg-muted"
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
                    className="hover:bg-muted"
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
