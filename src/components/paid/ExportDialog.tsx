import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_EXPORT_COLUMNS, ExportColumn } from "@/services/exportService";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: 'csv' | 'xlsx', columns: ExportColumn[], dateRange: { from?: string; to?: string }) => void;
  totalCount: number;
  currentFilters?: {
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
  };
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  totalCount,
  currentFilters,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [columns, setColumns] = useState<ExportColumn[]>(DEFAULT_EXPORT_COLUMNS);
  const [dateFrom, setDateFrom] = useState(currentFilters?.invoiceDateFrom || '');
  const [dateTo, setDateTo] = useState(currentFilters?.invoiceDateTo || '');
  const [useDateRange, setUseDateRange] = useState(!!currentFilters?.invoiceDateFrom || !!currentFilters?.invoiceDateTo);

  const toggleColumn = (key: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.key === key ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  const selectAllColumns = () => {
    setColumns(cols => cols.map(col => ({ ...col, enabled: true })));
  };

  const deselectAllColumns = () => {
    setColumns(cols => cols.map(col => ({ ...col, enabled: false })));
  };

  const handleExport = () => {
    const dateRange = useDateRange ? { from: dateFrom, to: dateTo } : {};
    onExport(format, columns, dateRange);
    onOpenChange(false);
  };

  const enabledCount = columns.filter(col => col.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Paid Invoices
          </DialogTitle>
          <DialogDescription>
            Export {totalCount.toLocaleString()} invoices with customizable columns and format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">File Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'xlsx')}>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-4 w-4 text-success" />
                  <div>
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-xs text-muted-foreground">Recommended for data analysis with formatting</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-blue" />
                  <div>
                    <div className="font-medium">CSV (.csv)</div>
                    <div className="text-xs text-muted-foreground">Universal format compatible with all systems</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">Date Range (Optional)</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-date-range"
                  checked={useDateRange}
                  onCheckedChange={(checked) => setUseDateRange(!!checked)}
                />
                <Label htmlFor="use-date-range" className="text-sm font-normal cursor-pointer">
                  Filter by date
                </Label>
              </div>
            </div>
            {useDateRange && (
              <div className="grid grid-cols-2 gap-3 p-3 border border-border rounded-lg bg-muted/20">
                <div>
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Select Columns ({enabledCount}/{columns.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllColumns}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllColumns}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-64 border border-border rounded-lg p-3 bg-muted/20">
              <div className="space-y-2">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={column.enabled}
                      onCheckedChange={() => toggleColumn(column.key)}
                    />
                    <span className="text-sm text-foreground flex-1">{column.label}</span>
                    {column.enabled && (
                      <span className="text-xs text-primary font-medium">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={enabledCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
