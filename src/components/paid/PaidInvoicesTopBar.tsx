import React, { useState, useMemo, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaidInvoicesTopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onOpenFilters: () => void;
  onOpenExport?: () => void;
  activeFiltersCount?: number;
  activeFilterChips?: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter?: (key: string, value: string) => void;
}

const SORT_OPTIONS = [
  { field: "invoice_date", label: "Invoice Date" },
  { field: "due_date", label: "Due Date" },
  { field: "total_amount", label: "Amount" },
  { field: "paid_date", label: "Date Paid" },
];

const PAGE_SIZE_OPTIONS = [10, 50, 100, 500];

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function PaidInvoicesTopBar({
  searchQuery,
  onSearchChange,
  sortField,
  sortDirection,
  onSortChange,
  pageSize,
  onPageSizeChange,
  onOpenFilters,
  onOpenExport,
  activeFiltersCount = 0,
  activeFilterChips = [],
  onRemoveFilter,
}: PaidInvoicesTopBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  const debouncedSearch = useMemo(
    () => debounce((value: string) => onSearchChange(value), 300),
    [onSearchChange]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const currentSort = SORT_OPTIONS.find((opt) => opt.field === sortField);
  const sortLabel = currentSort
    ? `${currentSort.label} ${sortDirection === "asc" ? "↑" : "↓"}`
    : "Sort";

  return (
    <div className="sticky top-0 z-20 bg-card border-b border-border shadow-soft">
      <div className="px-6 py-5 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by invoice number or supplier"
            value={localSearch}
            onChange={handleSearchInput}
            data-search-input
            className="pl-9 h-11 rounded-xl border-input focus:border-blue focus:ring-2 focus:ring-blue/10 transition-all"
          />
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 rounded-lg hover:bg-muted hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              {sortLabel}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {SORT_OPTIONS.map((option) => (
              <React.Fragment key={option.field}>
                <DropdownMenuItem
                  onClick={() => onSortChange(option.field, "asc")}
                  className="gap-2"
                >
                  {option.label} ↑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSortChange(option.field, "desc")}
                  className="gap-2"
                >
                  {option.label} ↓
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rows per page */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 rounded-lg hover:bg-muted hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              {pageSize} rows
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => onPageSizeChange(size)}
                className={pageSize === size ? "bg-accent" : ""}
              >
                {size} rows
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters button */}
        <Button 
          variant={activeFiltersCount > 0 ? "default" : "outline"}
          onClick={onOpenFilters} 
          className={`gap-2 rounded-lg relative hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 ${
            activeFiltersCount > 0 ? "border-primary bg-primary/10 text-primary hover:bg-primary/20" : ""
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue rounded-full border-2 border-card" />
          )}
        </Button>

        {/* Export button */}
        {onOpenExport && (
          <Button 
            variant="outline"
            onClick={onOpenExport} 
            className="gap-2 rounded-lg hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="px-6 pb-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
            {activeFilterChips.map((chip, idx) => (
              <button
                key={`${chip.key}-${chip.value}-${idx}`}
                onClick={() => onRemoveFilter?.(chip.key, chip.value)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <span>{chip.label}: {chip.value}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
