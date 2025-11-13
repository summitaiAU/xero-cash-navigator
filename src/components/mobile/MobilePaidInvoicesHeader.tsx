import React, { useState } from 'react';
import { Menu, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobilePaidInvoicesHeaderProps {
  searchQuery: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  activeFiltersCount: number;
  onSearchChange: (query: string) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  onOpenFilters: () => void;
  onOpenHamburgerMenu: () => void;
}

const SORT_OPTIONS = [
  { value: 'invoice_date', label: 'Invoice Date', direction: 'desc' as const },
  { value: 'invoice_date', label: 'Invoice Date', direction: 'asc' as const },
  { value: 'due_date', label: 'Due Date', direction: 'desc' as const },
  { value: 'due_date', label: 'Due Date', direction: 'asc' as const },
  { value: 'total_amount', label: 'Amount', direction: 'desc' as const },
  { value: 'total_amount', label: 'Amount', direction: 'asc' as const },
  { value: 'paid_date', label: 'Date Paid', direction: 'desc' as const },
  { value: 'paid_date', label: 'Date Paid', direction: 'asc' as const },
];

export const MobilePaidInvoicesHeader: React.FC<MobilePaidInvoicesHeaderProps> = ({
  searchQuery,
  sortField,
  sortDirection,
  activeFiltersCount,
  onSearchChange,
  onSortChange,
  onOpenFilters,
  onOpenHamburgerMenu,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearchChange(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const currentSort = SORT_OPTIONS.find(
    opt => opt.value === sortField && opt.direction === sortDirection
  ) || SORT_OPTIONS[0];

  const getSortLabel = () => {
    const arrow = sortDirection === 'desc' ? '↓' : '↑';
    return `${currentSort.label} ${arrow}`;
  };

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="h-16 px-2 py-3 flex items-center gap-2">
        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          onClick={onOpenHamburgerMenu}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search Input */}
        <Input
          placeholder="Search invoices..."
          className="h-10 rounded-lg px-3 text-base flex-1"
          style={{ fontSize: '16px' }}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 px-3 gap-1 rounded-full flex-shrink-0">
              <span className="text-xs font-medium">{getSortLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={`${option.value}-${option.direction}`}
                onClick={() => onSortChange(option.value, option.direction)}
              >
                {option.label} {option.direction === 'desc' ? '↓' : '↑'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full relative flex-shrink-0"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-orange-600 hover:bg-orange-600">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};
