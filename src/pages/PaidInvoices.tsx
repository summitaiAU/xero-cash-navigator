import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PaidInvoicesTopBar } from "@/components/paid/PaidInvoicesTopBar";
import { PaidInvoicesTable } from "@/components/paid/PaidInvoicesTable";
import { PaidInvoicesFilterDrawer } from "@/components/paid/PaidInvoicesFilterDrawer";
import { PaidInvoiceViewer } from "@/components/paid/PaidInvoiceViewer";
import { ExportDialog } from "@/components/paid/ExportDialog";
import { Invoice } from "@/types/invoice";
import {
  fetchPaidInvoices,
  prefetchPaidInvoicesPage,
  PaidInvoicesFilters,
} from "@/services/paidInvoicesService";
import { paidInvoicesCacheService } from "@/services/paidInvoicesCache";
import { 
  exportToCSV, 
  exportToExcel, 
  ExportColumn,
  generateFilename
} from "@/services/exportService";

export default function PaidInvoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Parse URL params
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(
    searchParams.get("pageSize") || localStorage.getItem("paidInvoicesPageSize") || "50",
    10
  );
  const searchQuery = searchParams.get("search") || "";
  const sortField = searchParams.get("sortBy") || "paid_date";
  const sortDirection = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const invoiceId = searchParams.get("invoiceId") || null;

  // Parse filters from URL
  const filters: PaidInvoicesFilters = {
    invoiceDateFrom: searchParams.get("invoiceDateFrom") || undefined,
    invoiceDateTo: searchParams.get("invoiceDateTo") || undefined,
    paidDateFrom: searchParams.get("paidDateFrom") || undefined,
    paidDateTo: searchParams.get("paidDateTo") || undefined,
    priceMin: searchParams.get("priceMin")
      ? Number(searchParams.get("priceMin"))
      : undefined,
    priceMax: searchParams.get("priceMax")
      ? Number(searchParams.get("priceMax"))
      : undefined,
    entities: searchParams.get("entities")?.split(",").filter(Boolean) || undefined,
    statuses: searchParams.get("statuses")?.split(",").filter(Boolean) || ["PAID"],
    suppliers: searchParams.get("suppliers")?.split(",").filter(Boolean) || undefined,
  };

  // Calculate active filters count
  const activeFiltersCount = [
    filters.invoiceDateFrom,
    filters.invoiceDateTo,
    filters.paidDateFrom,
    filters.paidDateTo,
    filters.priceMin,
    filters.priceMax,
    filters.entities?.length,
    (filters.statuses && filters.statuses.length !== 1) ? filters.statuses.length : 0,
    filters.suppliers?.length,
  ].filter((v) => v).length;

  // Generate filter chips
  const activeFilterChips: Array<{ key: string; label: string; value: string }> = [];
  if (filters.entities) {
    filters.entities.forEach(e => activeFilterChips.push({ key: "entities", label: "Entity", value: e }));
  }
  if (filters.suppliers) {
    filters.suppliers.forEach(s => activeFilterChips.push({ key: "suppliers", label: "Supplier", value: s }));
  }
  if (filters.statuses && filters.statuses.length > 0 && !(filters.statuses.length === 1 && filters.statuses[0] === "PAID")) {
    filters.statuses.forEach(st => activeFilterChips.push({ key: "statuses", label: "Status", value: st }));
  }

  // Generate cache key
  const cacheKey = paidInvoicesCacheService.generateCacheKey({
    page,
    pageSize,
    searchQuery,
    sortField,
    sortDirection,
    filters,
  });

  // Fetch invoices with caching
  const loadInvoices = useCallback(
    async (showLoading = true, isPageChange = false) => {
      if (showLoading && !isPageChange) setLoading(true);
      if (isPageChange) setIsChangingPage(true);
      setError(null);

      // Check cache first
      const cached = paidInvoicesCacheService.getCachedList(cacheKey);
      if (cached) {
        setInvoices(cached.data);
        setTotalCount(cached.totalCount);
        if (showLoading && !isPageChange) setLoading(false);
      }

      // Fetch fresh data
      try {
        const result = await fetchPaidInvoices({
          page,
          pageSize,
          searchQuery,
          sortField,
          sortDirection,
          filters,
        });

        if (!result.error) {
          setInvoices(result.data);
          setTotalCount(result.totalCount);
          paidInvoicesCacheService.setCachedList(
            cacheKey,
            result.data,
            result.totalCount
          );

          // Prefetch next page
          prefetchPaidInvoicesPage({
            page,
            pageSize,
            searchQuery,
            sortField,
            sortDirection,
            filters,
          });
        } else {
          setError(result.error.message || "Failed to load invoices");
          toast.error("Failed to load data", {
            description: result.error.message,
          });
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
        toast.error("Failed to load data", {
          description: err.message,
        });
      }

      setLoading(false);
      setIsChangingPage(false);
    },
    [cacheKey, page, pageSize, searchQuery, sortField, sortDirection, filters]
  );

  // Load invoices on mount and param changes
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Restore scroll position
  useEffect(() => {
    const scrollPos = paidInvoicesCacheService.getScrollPosition(cacheKey);
    if (scrollContainerRef.current && scrollPos > 0) {
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [cacheKey]);

  // Save scroll position
  useEffect(() => {
    return () => {
      if (scrollContainerRef.current) {
        paidInvoicesCacheService.setScrollPosition(
          cacheKey,
          scrollContainerRef.current.scrollTop
        );
      }
    };
  }, [cacheKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.matches("input, textarea, select");

      // Focus search: / or Ctrl+K
      if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && !isInputFocused) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
      }

      // Open filters: F
      if (e.key === "f" && !isInputFocused) {
        e.preventDefault();
        setFilterDrawerOpen(true);
      }

      // Close drawer/viewer: Escape
      if (e.key === "Escape") {
        if (filterDrawerOpen) setFilterDrawerOpen(false);
        if (invoiceId) handleCloseViewer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filterDrawerOpen, invoiceId]);

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Handlers
  const handleSearchChange = useCallback(
    (query: string) => {
      updateParams({ search: query, page: "0" });
    },
    [searchParams]
  );

  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => {
      updateParams({ sortBy: field, sortDir: direction, page: "0" });
    },
    [searchParams]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      localStorage.setItem("paidInvoicesPageSize", size.toString());
      updateParams({ pageSize: size.toString(), page: "0" });
    },
    [searchParams]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage.toString() });
      loadInvoices(true, true);
    },
    [searchParams, loadInvoices]
  );

  const handleApplyFilters = useCallback(
    (newFilters: PaidInvoicesFilters) => {
      const updates: Record<string, string | null> = {
        page: "0",
        invoiceDateFrom: newFilters.invoiceDateFrom || null,
        invoiceDateTo: newFilters.invoiceDateTo || null,
        paidDateFrom: newFilters.paidDateFrom || null,
        paidDateTo: newFilters.paidDateTo || null,
        priceMin: newFilters.priceMin?.toString() || null,
        priceMax: newFilters.priceMax?.toString() || null,
        entities: newFilters.entities?.join(",") || null,
        statuses: newFilters.statuses?.join(",") || null,
        suppliers: newFilters.suppliers?.join(",") || null,
      };
      updateParams(updates);
      toast.success("Filters applied", {
        description: `Showing filtered results`,
      });
    },
    [searchParams]
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      page: "0",
      invoiceDateFrom: null,
      invoiceDateTo: null,
      paidDateFrom: null,
      paidDateTo: null,
      priceMin: null,
      priceMax: null,
      entities: null,
      statuses: null,
      suppliers: null,
    });
    toast.info("Filters cleared");
  }, [searchParams]);

  const handleRemoveFilter = useCallback(
    (key: string, value: string) => {
      const current = filters[key as keyof PaidInvoicesFilters];
      if (Array.isArray(current)) {
        const updated = current.filter((v) => v !== value);
        updateParams({ [key]: updated.length > 0 ? updated.join(",") : null, page: "0" });
      }
    },
    [filters, searchParams]
  );

  const handleInvoiceClick = useCallback(
    (id: string) => {
      updateParams({ invoiceId: id });
    },
    [searchParams]
  );

  const handleCloseViewer = useCallback(() => {
    updateParams({ invoiceId: null });
  }, [searchParams]);

  const handleNavigateInvoice = useCallback(
    (id: string) => {
      updateParams({ invoiceId: id });
    },
    [searchParams]
  );

  const handleExport = useCallback(
    async (format: 'csv' | 'xlsx', columns: ExportColumn[], dateRange: { from?: string; to?: string }) => {
      try {
        toast.info('Preparing export...', {
          description: 'Fetching all invoices for export',
        });

        // Fetch all invoices with current filters (no pagination)
        const result = await fetchPaidInvoices({
          page: 0,
          pageSize: 10000, // Large number to get all
          searchQuery,
          sortField,
          sortDirection,
          filters: {
            ...filters,
            invoiceDateFrom: dateRange.from || filters.invoiceDateFrom,
            invoiceDateTo: dateRange.to || filters.invoiceDateTo,
          },
        });

        if (result.error) {
          toast.error('Export failed', {
            description: result.error.message,
          });
          return;
        }

        const filename = generateFilename(format, dateRange);
        
        if (format === 'csv') {
          exportToCSV(result.data, columns, filename);
        } else {
          exportToExcel(result.data, columns, filename);
        }

        toast.success('Export successful', {
          description: `Downloaded ${result.data.length} invoices as ${format.toUpperCase()}`,
        });
      } catch (err: any) {
        toast.error('Export failed', {
          description: err.message || 'An unexpected error occurred',
        });
      }
    },
    [searchQuery, sortField, sortDirection, filters]
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const invoiceIds = invoices.map((inv) => inv.id);

  return (
    <div className="h-full flex flex-col bg-background">
      <PaidInvoicesTopBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        onOpenFilters={() => setFilterDrawerOpen(true)}
        onOpenExport={() => setExportDialogOpen(true)}
        activeFiltersCount={activeFiltersCount}
        activeFilterChips={activeFilterChips}
        onRemoveFilter={handleRemoveFilter}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <PaidInvoicesTable
          invoices={invoices}
          loading={loading}
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onInvoiceClick={handleInvoiceClick}
          isChangingPage={isChangingPage}
          onClearFilters={activeFiltersCount > 0 ? handleClearFilters : undefined}
        />
      </div>

      <PaidInvoicesFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <PaidInvoiceViewer
        invoiceId={invoiceId}
        open={!!invoiceId}
        onOpenChange={(open) => !open && handleCloseViewer()}
        invoiceIds={invoiceIds}
        onNavigate={handleNavigateInvoice}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        totalCount={totalCount}
        currentFilters={{
          invoiceDateFrom: filters.invoiceDateFrom,
          invoiceDateTo: filters.invoiceDateTo,
        }}
      />
    </div>
  );
}
