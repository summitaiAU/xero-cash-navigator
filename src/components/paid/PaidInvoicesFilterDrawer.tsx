import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaidInvoicesFilters } from "@/services/paidInvoicesService";
import {
  fetchUniqueEntities,
  fetchUniqueSuppliers,
} from "@/services/paidInvoicesService";
import { getSydneyNow, getDateStringSydney } from "@/lib/dateUtils";

interface PaidInvoicesFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PaidInvoicesFilters;
  onApply: (filters: PaidInvoicesFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY PAID", label: "Partially Paid" },
  { value: "FLAGGED", label: "Flagged" },
  { value: "READY", label: "Ready" },
];

const DATE_PRESETS = [
  { value: "all", label: "Show All" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "custom", label: "Custom range" },
];

export function PaidInvoicesFilterDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
}: PaidInvoicesFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<PaidInvoicesFilters>(filters);
  const [entities, setEntities] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [paidDatePreset, setPaidDatePreset] = useState("all");

  useEffect(() => {
    if (open) {
      fetchUniqueEntities().then(setEntities);
      fetchUniqueSuppliers().then(setSuppliers);
    }
  }, [open]);

  // Helper to detect which preset matches the given dates
  const detectPresetFromDates = (fromDate?: string, toDate?: string): string => {
    if (!fromDate && !toDate) return "all";
    if (!fromDate || !toDate) return "custom";

    const today = getSydneyNow();
    const presetRanges: Record<string, { from: string; to: string }> = {
      last7: {
        from: getDateStringSydney(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
        to: getDateStringSydney(today),
      },
      last30: {
        from: getDateStringSydney(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
        to: getDateStringSydney(today),
      },
      thisMonth: {
        from: getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: getDateStringSydney(today),
      },
      lastMonth: {
        from: getDateStringSydney(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 0)),
      },
      thisQuarter: {
        from: getDateStringSydney(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)),
        to: getDateStringSydney(today),
      },
    };

    for (const [preset, range] of Object.entries(presetRanges)) {
      if (fromDate === range.from && toDate === range.to) {
        return preset;
      }
    }

    return "custom";
  };

  useEffect(() => {
    if (!open) return;
    
    setLocalFilters(filters);
    setDatePreset(detectPresetFromDates(filters.invoiceDateFrom, filters.invoiceDateTo));
    setPaidDatePreset(detectPresetFromDates(filters.paidDateFrom, filters.paidDateTo));
  }, [open]);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    
    if (preset === "all") {
      setLocalFilters({ ...localFilters, invoiceDateFrom: undefined, invoiceDateTo: undefined });
      return;
    }
    
    if (preset === "custom") {
      return;
    }

    const today = getSydneyNow();
    let from = "";
    let to = getDateStringSydney(today);

    switch (preset) {
      case "last7":
        from = getDateStringSydney(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case "last30":
        from = getDateStringSydney(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case "thisMonth":
        from = getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 1));
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = getDateStringSydney(lastMonth);
        to = getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "thisQuarter":
        const quarter = Math.floor(today.getMonth() / 3);
        from = getDateStringSydney(new Date(today.getFullYear(), quarter * 3, 1));
        break;
    }

    setLocalFilters({ ...localFilters, invoiceDateFrom: from, invoiceDateTo: to });
  };

  const handlePaidDatePresetChange = (preset: string) => {
    setPaidDatePreset(preset);
    
    if (preset === "all") {
      setLocalFilters({ ...localFilters, paidDateFrom: undefined, paidDateTo: undefined });
      return;
    }
    
    if (preset === "custom") {
      return;
    }

    const today = getSydneyNow();
    let from = "";
    let to = getDateStringSydney(today);

    switch (preset) {
      case "last7":
        from = getDateStringSydney(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case "last30":
        from = getDateStringSydney(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case "thisMonth":
        from = getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 1));
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = getDateStringSydney(lastMonth);
        to = getDateStringSydney(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "thisQuarter":
        const quarter = Math.floor(today.getMonth() / 3);
        from = getDateStringSydney(new Date(today.getFullYear(), quarter * 3, 1));
        break;
    }

    setLocalFilters({ ...localFilters, paidDateFrom: from, paidDateTo: to });
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    setDatePreset("all");
    setPaidDatePreset("all");
    setSupplierSearch("");
    onClear();
    onOpenChange(false);
  };

  const setStatusChecked = (status: string, checked: boolean) => {
    const current = new Set(localFilters.statuses ?? []);
    if (checked) {
      current.add(status);
    } else {
      current.delete(status);
    }
    setLocalFilters({ ...localFilters, statuses: Array.from(current) });
  };

  const setEntityChecked = (entity: string, checked: boolean) => {
    const current = new Set(localFilters.entities ?? []);
    if (checked) {
      current.add(entity);
    } else {
      current.delete(entity);
    }
    setLocalFilters({ ...localFilters, entities: Array.from(current) });
  };

  const setSupplierChecked = (supplier: string, checked: boolean) => {
    const current = new Set(localFilters.suppliers ?? []);
    if (checked) {
      current.add(supplier);
    } else {
      current.delete(supplier);
    }
    setLocalFilters({ ...localFilters, suppliers: Array.from(current) });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const selectedStatuses = localFilters.statuses ?? [];
  const selectedEntities = localFilters.entities ?? [];
  const selectedSuppliers = localFilters.suppliers ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] p-0 flex flex-col data-[state=open]:animate-slide-in-right">
        <SheetHeader className="px-6 py-4 border-b border-border bg-card">
          <SheetTitle className="text-lg font-semibold text-foreground">Filter Invoices</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={selectedStatuses.includes(option.value)}
                      onCheckedChange={(checked) => setStatusChecked(option.value, checked === true)}
                    />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Invoice Date Range with Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Invoice Date</Label>
              
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {datePreset === "custom" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="invoice-date-from" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="invoice-date-from"
                      type="date"
                      value={localFilters.invoiceDateFrom || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, invoiceDateFrom: e.target.value })
                      }
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-date-to" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="invoice-date-to"
                      type="date"
                      value={localFilters.invoiceDateTo || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, invoiceDateTo: e.target.value })
                      }
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Date Paid Range with Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Date Paid</Label>
              
              <Select value={paidDatePreset} onValueChange={handlePaidDatePresetChange}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {paidDatePreset === "custom" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="paid-date-from" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="paid-date-from"
                      type="date"
                      value={localFilters.paidDateFrom || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, paidDateFrom: e.target.value })
                      }
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paid-date-to" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="paid-date-to"
                      type="date"
                      value={localFilters.paidDateTo || ""}
                      onChange={(e) =>
                        setLocalFilters({ ...localFilters, paidDateTo: e.target.value })
                      }
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Price Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price-min" className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    id="price-min"
                    type="number"
                    step="0.01"
                    placeholder="Min"
                    value={localFilters.priceMin || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        priceMin: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="price-max" className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    id="price-max"
                    type="number"
                    step="0.01"
                    placeholder="Max"
                    value={localFilters.priceMax || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        priceMax: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Entity with Chips */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Entity</Label>
              
              {selectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-blue-light/50 rounded-lg border border-blue/10">
                  {selectedEntities.map((entity) => (
                    <button
                      key={entity}
                      onClick={() => setEntityChecked(entity, false)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-light text-blue text-xs font-medium hover:bg-blue-hover/20 transition-colors"
                    >
                      {entity}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className="h-32 border border-border rounded-lg p-2">
                {entities.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No entities found</p>
                ) : (
                  <div className="space-y-1">
                    {entities.map((entity) => (
                      <label key={entity} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox
                          checked={selectedEntities.includes(entity)}
                          onCheckedChange={(checked) => setEntityChecked(entity, checked === true)}
                        />
                        <span className="text-sm text-foreground">{entity}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Supplier with Chips */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Supplier</Label>
              
              <Input
                type="search"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="rounded-lg"
              />

              {selectedSuppliers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-blue-light/50 rounded-lg border border-blue/10">
                  {selectedSuppliers.map((supplier) => (
                    <button
                      key={supplier}
                      onClick={() => setSupplierChecked(supplier, false)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-light text-blue text-xs font-medium hover:bg-blue-hover/20 transition-colors"
                    >
                      {supplier}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className="h-32 border border-border rounded-lg p-2">
                {filteredSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No suppliers found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredSuppliers.map((supplier) => (
                      <label key={supplier} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier)}
                          onCheckedChange={(checked) => setSupplierChecked(supplier, checked === true)}
                        />
                        <span className="text-sm text-foreground">{supplier}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={handleClear} 
              className="flex-1 rounded-lg border-border hover:bg-muted"
            >
              Clear All
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1 rounded-lg bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
            >
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
