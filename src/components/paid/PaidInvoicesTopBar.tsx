import React from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
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
}

const SORT_OPTIONS = [
  { field: "invoice_date", label: "Invoice Date" },
  { field: "due_date", label: "Due Date" },
  { field: "total_amount", label: "Amount" },
  { field: "paid_date", label: "Date Paid" },
];

const PAGE_SIZE_OPTIONS = [10, 50, 100, 500];

export function PaidInvoicesTopBar({
  searchQuery,
  onSearchChange,
  sortField,
  sortDirection,
  onSortChange,
  pageSize,
  onPageSizeChange,
  onOpenFilters,
}: PaidInvoicesTopBarProps) {
  const currentSort = SORT_OPTIONS.find((opt) => opt.field === sortField);
  const sortLabel = currentSort
    ? `${currentSort.label} ${sortDirection === "asc" ? "↑" : "↓"}`
    : "Sort";

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border p-4 flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search invoice number or supplier..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
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
          <Button variant="outline" className="gap-2">
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
      <Button variant="outline" onClick={onOpenFilters} className="gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </Button>
    </div>
  );
}
