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
import { PaidInvoicesFilters } from "@/services/paidInvoicesService";
import {
  fetchUniqueEntities,
  fetchUniqueSuppliers,
} from "@/services/paidInvoicesService";

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

export function PaidInvoicesFilterDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
}: PaidInvoicesFilterDrawerProps) {
  const [localFilters, setLocalFilters] =
    useState<PaidInvoicesFilters>(filters);
  const [entities, setEntities] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");

  // Load entities and suppliers when drawer opens
  useEffect(() => {
    if (open) {
      fetchUniqueEntities().then(setEntities);
      fetchUniqueSuppliers().then(setSuppliers);
    }
  }, [open]);

  // Sync local filters with prop filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
    onOpenChange(false);
  };

  const toggleStatus = (status: string) => {
    const current = localFilters.statuses || ["PAID"];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setLocalFilters({ ...localFilters, statuses: updated });
  };

  const toggleEntity = (entity: string) => {
    const current = localFilters.entities || [];
    const updated = current.includes(entity)
      ? current.filter((e) => e !== entity)
      : [...current, entity];
    setLocalFilters({ ...localFilters, entities: updated });
  };

  const toggleSupplier = (supplier: string) => {
    const current = localFilters.suppliers || [];
    const updated = current.includes(supplier)
      ? current.filter((s) => s !== supplier)
      : [...current, supplier];
    setLocalFilters({ ...localFilters, suppliers: updated });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status</Label>
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={(localFilters.statuses || ["PAID"]).includes(
                      option.value
                    )}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Invoice Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Invoice Date</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="invoice-date-from" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="invoice-date-from"
                    type="date"
                    value={localFilters.invoiceDateFrom || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        invoiceDateFrom: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-date-to" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="invoice-date-to"
                    type="date"
                    value={localFilters.invoiceDateTo || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        invoiceDateTo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Date Paid Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Date Paid</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="paid-date-from" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="paid-date-from"
                    type="date"
                    value={localFilters.paidDateFrom || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        paidDateFrom: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="paid-date-to" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="paid-date-to"
                    type="date"
                    value={localFilters.paidDateTo || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        paidDateTo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Price Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="price-min" className="text-xs">
                    Min
                  </Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="price-max" className="text-xs">
                    Max
                  </Label>
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
                  />
                </div>
              </div>
            </div>

            {/* Entity */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Entity</Label>
              <ScrollArea className="h-32 border rounded-md p-3">
                {entities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No entities found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entities.map((entity) => (
                      <div key={entity} className="flex items-center gap-2">
                        <Checkbox
                          id={`entity-${entity}`}
                          checked={(localFilters.entities || []).includes(
                            entity
                          )}
                          onCheckedChange={() => toggleEntity(entity)}
                        />
                        <Label
                          htmlFor={`entity-${entity}`}
                          className="font-normal cursor-pointer text-sm"
                        >
                          {entity}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Supplier */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Supplier</Label>
              <Input
                type="search"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="mb-2"
              />
              <ScrollArea className="h-32 border rounded-md p-3">
                {filteredSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suppliers found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredSuppliers.map((supplier) => (
                      <div key={supplier} className="flex items-center gap-2">
                        <Checkbox
                          id={`supplier-${supplier}`}
                          checked={(localFilters.suppliers || []).includes(
                            supplier
                          )}
                          onCheckedChange={() => toggleSupplier(supplier)}
                        />
                        <Label
                          htmlFor={`supplier-${supplier}`}
                          className="font-normal cursor-pointer text-sm"
                        >
                          {supplier}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 pt-4 border-t flex gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
