import React from 'react';
import { Invoice } from '@/types/invoice';
import { PaidInvoicesFilters } from '@/services/paidInvoicesService';
import { MobilePaidInvoicesHeader } from './MobilePaidInvoicesHeader';
import { MobileFilterChips } from './MobileFilterChips';
import { MobilePaidInvoicesList } from './MobilePaidInvoicesList';
import { MobilePaginationBar } from './MobilePaginationBar';

interface MobilePaidInvoicesProps {
  invoices: Invoice[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchQuery: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  filters: PaidInvoicesFilters;
  activeFiltersCount: number;
  activeFilterChips: Array<{ key: string; label: string; value: string }>;
  onSearchChange: (query: string) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onOpenFilters: () => void;
  onRemoveFilter: (key: string, value: string) => void;
  onInvoiceClick: (invoiceId: string) => void;
  onClearFilters: () => void;
  onOpenHamburgerMenu: () => void;
}

export const MobilePaidInvoices: React.FC<MobilePaidInvoicesProps> = ({
  invoices,
  loading,
  totalCount,
  currentPage,
  totalPages,
  pageSize,
  searchQuery,
  sortField,
  sortDirection,
  filters,
  activeFiltersCount,
  activeFilterChips,
  onSearchChange,
  onSortChange,
  onPageChange,
  onOpenFilters,
  onRemoveFilter,
  onInvoiceClick,
  onClearFilters,
  onOpenHamburgerMenu,
}) => {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <MobilePaidInvoicesHeader
        searchQuery={searchQuery}
        sortField={sortField}
        sortDirection={sortDirection}
        activeFiltersCount={activeFiltersCount}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onOpenFilters={onOpenFilters}
        onOpenHamburgerMenu={onOpenHamburgerMenu}
      />

      {activeFilterChips.length > 0 && (
        <MobileFilterChips
          chips={activeFilterChips}
          onRemove={onRemoveFilter}
        />
      )}

      <MobilePaidInvoicesList
        invoices={invoices}
        loading={loading}
        onInvoiceClick={onInvoiceClick}
        onClearFilters={activeFiltersCount > 0 ? onClearFilters : undefined}
      />

      <MobilePaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
};
