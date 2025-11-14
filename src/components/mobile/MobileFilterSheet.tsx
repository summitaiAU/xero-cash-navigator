import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSydneyNow, getDateStringSydney } from '@/lib/dateUtils';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { PaidInvoicesFilters, fetchUniqueEntities, fetchUniqueSuppliers } from '@/services/paidInvoicesService';

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PaidInvoicesFilters;
  onApply: (filters: PaidInvoicesFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: 'READY', label: 'Ready' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'lastQuarter', label: 'Last quarter' },
  { value: 'thisYear', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const calculateDateRange = (preset: string): { from: string; to: string } | null => {
  const now = getSydneyNow();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  
  switch (preset) {
    case 'today':
      return {
        from: getDateStringSydney(todayStart),
        to: getDateStringSydney(todayEnd),
      };
    case 'yesterday':
      const yesterday = subDays(todayStart, 1);
      return {
        from: getDateStringSydney(startOfDay(yesterday)),
        to: getDateStringSydney(endOfDay(yesterday)),
      };
    case 'last7days':
      return {
        from: getDateStringSydney(subDays(todayStart, 7)),
        to: getDateStringSydney(todayEnd),
      };
    case 'last30days':
      return {
        from: getDateStringSydney(subDays(todayStart, 30)),
        to: getDateStringSydney(todayEnd),
      };
    case 'thisMonth':
      return {
        from: getDateStringSydney(startOfMonth(now)),
        to: getDateStringSydney(endOfMonth(now)),
      };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return {
        from: getDateStringSydney(startOfMonth(lastMonth)),
        to: getDateStringSydney(endOfMonth(lastMonth)),
      };
    case 'thisQuarter':
      return {
        from: getDateStringSydney(startOfQuarter(now)),
        to: getDateStringSydney(endOfQuarter(now)),
      };
    case 'lastQuarter':
      const lastQuarter = subQuarters(now, 1);
      return {
        from: getDateStringSydney(startOfQuarter(lastQuarter)),
        to: getDateStringSydney(endOfQuarter(lastQuarter)),
      };
    case 'thisYear':
      return {
        from: getDateStringSydney(startOfYear(now)),
        to: getDateStringSydney(endOfYear(now)),
      };
    default:
      return null;
  }
};

const detectPresetFromDates = (fromDate?: string, toDate?: string): string | undefined => {
  // If no dates at all, return undefined (no preset selected)
  if (!fromDate && !toDate) return undefined;
  
  // If incomplete dates, consider it custom
  if (!fromDate || !toDate) return 'custom';
  
  // Calculate all preset ranges and check for matches
  const presets = ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter', 'thisYear'];
  
  for (const preset of presets) {
    const range = calculateDateRange(preset);
    if (range && fromDate === range.from && toDate === range.to) {
      return preset;
    }
  }
  
  // Dates don't match any preset - must be custom
  return 'custom';
};

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
}) => {
  const [localFilters, setLocalFilters] = useState<PaidInvoicesFilters>(filters);
  const [entities, setEntities] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [invoiceDatePreset, setInvoiceDatePreset] = useState<string | undefined>();
  const [paidDatePreset, setPaidDatePreset] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      
      // Detect and set the correct presets based on incoming filter dates
      setInvoiceDatePreset(detectPresetFromDates(filters.invoiceDateFrom, filters.invoiceDateTo));
      setPaidDatePreset(detectPresetFromDates(filters.paidDateFrom, filters.paidDateTo));
      
      fetchUniqueEntities().then(setEntities);
      fetchUniqueSuppliers().then(setSuppliers);
    }
  }, [open, filters]);

  const toggleStatus = (status: string) => {
    const current = localFilters.statuses || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setLocalFilters({ ...localFilters, statuses: updated });
  };

  const toggleEntity = (entity: string) => {
    const current = localFilters.entities || [];
    const updated = current.includes(entity)
      ? current.filter(e => e !== entity)
      : [...current, entity];
    setLocalFilters({ ...localFilters, entities: updated });
  };

  const toggleSupplier = (supplier: string) => {
    const current = localFilters.suppliers || [];
    const updated = current.includes(supplier)
      ? current.filter(s => s !== supplier)
      : [...current, supplier];
    setLocalFilters({ ...localFilters, suppliers: updated });
  };

  const handleDatePresetChange = (preset: string, field: 'invoiceDate' | 'paidDate') => {
    if (field === 'invoiceDate') {
      const isCurrentPreset = invoiceDatePreset === preset;
      setInvoiceDatePreset(isCurrentPreset ? undefined : preset);
      
      if (isCurrentPreset) {
        // Deselect - clear dates
        setLocalFilters({
          ...localFilters,
          invoiceDateFrom: undefined,
          invoiceDateTo: undefined,
        });
      } else if (preset === 'custom') {
        // Custom - keep existing dates or clear if none
        // User will manually enter dates
      } else {
        // Calculate date range based on preset
        const dateRange = calculateDateRange(preset);
        if (dateRange) {
          setLocalFilters({
            ...localFilters,
            invoiceDateFrom: dateRange.from,
            invoiceDateTo: dateRange.to,
          });
        }
      }
    } else {
      const isCurrentPreset = paidDatePreset === preset;
      setPaidDatePreset(isCurrentPreset ? undefined : preset);
      
      if (isCurrentPreset) {
        // Deselect - clear dates
        setLocalFilters({
          ...localFilters,
          paidDateFrom: undefined,
          paidDateTo: undefined,
        });
      } else if (preset === 'custom') {
        // Custom - keep existing dates or clear if none
        // User will manually enter dates
      } else {
        // Calculate date range based on preset
        const dateRange = calculateDateRange(preset);
        if (dateRange) {
          setLocalFilters({
            ...localFilters,
            paidDateFrom: dateRange.from,
            paidDateTo: dateRange.to,
          });
        }
      }
    }
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    onClear();
    onOpenChange(false);
  };

  const filteredEntities = entities.filter(e =>
    e.toLowerCase().includes(entitySearch.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-lg font-semibold">Filter invoices</SheetTitle>
        </SheetHeader>

        {/* Scrollable Filter Content */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {/* Status Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={localFilters.statuses?.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Invoice Date Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Invoice Date</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {DATE_PRESETS.map(preset => (
                  <Button
                    key={preset.value}
                    variant={invoiceDatePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleDatePresetChange(preset.value, 'invoiceDate')}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {invoiceDatePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    className="h-10"
                    value={localFilters.invoiceDateFrom || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, invoiceDateFrom: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    className="h-10"
                    value={localFilters.invoiceDateTo || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, invoiceDateTo: e.target.value })}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Date Paid Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Date Paid</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {DATE_PRESETS.map(preset => (
                  <Button
                    key={preset.value}
                    variant={paidDatePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleDatePresetChange(preset.value, 'paidDate')}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {paidDatePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    className="h-10"
                    value={localFilters.paidDateFrom || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, paidDateFrom: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    className="h-10"
                    value={localFilters.paidDateTo || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, paidDateTo: e.target.value })}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Price Range Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Price Range</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  className="h-10"
                  value={localFilters.priceMin || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value ? Number(e.target.value) : undefined })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="h-10"
                  value={localFilters.priceMax || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            <Separator />

            {/* Entity Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Entity</h3>
              <Input
                placeholder="Search entities..."
                className="h-10 mb-2"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
              />
              <ScrollArea className="h-40 rounded-md border border-border">
                <div className="p-2">
                  {filteredEntities.map(entity => (
                    <label key={entity} className="flex items-center gap-2 py-2 cursor-pointer">
                      <Checkbox
                        checked={localFilters.entities?.includes(entity)}
                        onCheckedChange={() => toggleEntity(entity)}
                      />
                      <span className="text-sm">{entity}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Supplier Filter */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Supplier</h3>
              <Input
                placeholder="Search suppliers..."
                className="h-10 mb-2"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
              <ScrollArea className="h-40 rounded-md border border-border">
                <div className="p-2">
                  {filteredSuppliers.map(supplier => (
                    <label key={supplier} className="flex items-center gap-2 py-2 cursor-pointer">
                      <Checkbox
                        checked={localFilters.suppliers?.includes(supplier)}
                        onCheckedChange={() => toggleSupplier(supplier)}
                      />
                      <span className="text-sm">{supplier}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1 h-11"
          >
            Clear all
          </Button>
          <Button
            variant="default"
            onClick={handleApply}
            className="flex-1 h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
