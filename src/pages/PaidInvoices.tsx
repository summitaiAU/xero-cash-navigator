import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PaidInvoicesTopBar } from "@/components/paid/PaidInvoicesTopBar";
import { PaidInvoicesTable } from "@/components/paid/PaidInvoicesTable";
import { PaidInvoicesFilterDrawer } from "@/components/paid/PaidInvoicesFilterDrawer";
import { PaidInvoiceViewer } from "@/components/paid/PaidInvoiceViewer";
import { ExportDialog } from "@/components/paid/ExportDialog";
import { Invoice } from "@/types/invoice";
import { useRealtime } from "@/contexts/RealtimeContext";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import {
  fetchPaidInvoices,
  prefetchPaidInvoicesPage,
  PaidInvoicesFilters,
} from "@/services/paidInvoicesService";
import { paidInvoicesCacheService } from "@/services/paidInvoicesCache";
import { useInvoiceLock } from "@/hooks/useInvoiceLock";
import { 
  exportToCSV, 
  exportToExcel, 
  ExportColumn,
  generateFilename
} from "@/services/exportService";
import { telemetry } from "@/services/telemetry";
import { ApiErrorLogger } from "@/services/apiErrorLogger";

export default function PaidInvoices() {
  const { isInvoiceBeingEdited, activeUsers } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const mountTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse URL params
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(
    searchParams.get("pageSize") || localStorage.getItem("paidInvoicesPageSize") || "50",
    10
  );
  const searchQuery = searchParams.get("search") || "";
  const sortField = searchParams.get("sortBy") || "paid_date";
  const sortDirection = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isViewerClosing, setIsViewerClosing] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Parse filters from URL
  const filters: PaidInvoicesFilters = useMemo(() => ({
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
  }), [searchParams]);

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

  // Defer initial data fetching to allow previous page cleanup
  useEffect(() => {
    mountTimeoutRef.current = setTimeout(() => {
      console.info('[PaidInvoices] Initial load delay complete');
      setIsInitialLoad(false);
    }, 250); // 250ms delay for graceful transition

    return () => {
      if (mountTimeoutRef.current) {
        clearTimeout(mountTimeoutRef.current);
      }
    };
  }, []);

  // Generate cache key
  const cacheKey = useMemo(() => 
    paidInvoicesCacheService.generateCacheKey({
      page,
      pageSize,
      searchQuery,
      sortField,
      sortDirection,
      filters,
    }),
    [page, pageSize, searchQuery, sortField, sortDirection, filters]
  );

  // Fetch invoices with caching and request coordination
  const loadInvoices = useCallback(
    async (showLoading = true, isPageChange = false) => {
      // Don't fetch during initial load period
      if (isInitialLoad) {
        return;
      }

      const myRequestId = ++requestIdRef.current;
      const t0 = performance.now();

      if (showLoading && !isPageChange) setLoading(true);
      if (isPageChange) setIsChangingPage(true);
      setError(null);

      // Check cache first
      const cached = paidInvoicesCacheService.getCachedList(cacheKey);
      if (cached) {
        console.info('[PaidInvoices] Using cached data', cacheKey);
        telemetry.logUIEvent('paid_cache_hit', {
          key: cacheKey,
          rows: cached.data.length,
        });

        // Check if request is still valid
        if (myRequestId !== requestIdRef.current) {
          console.info('[PaidInvoices] Request superseded (cache)', { myRequestId });
          telemetry.logUIEvent('paid_load_aborted', { myRequestId, reason: 'cache_superseded' });
          return;
        }

        setInvoices(cached.data);
        setTotalCount(cached.totalCount);
        if (showLoading && !isPageChange) setLoading(false);
        
        telemetry.logPerf('paid_load_first_data', {
          duration: performance.now() - t0,
          rows: cached.data.length,
          page,
          cached: true,
        });
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

        // Check if request is still valid before updating state
        if (myRequestId !== requestIdRef.current) {
          console.info('[PaidInvoices] Request superseded (fetch)', { myRequestId });
          telemetry.logUIEvent('paid_load_aborted', { myRequestId, reason: 'fetch_superseded' });
          return;
        }

        if (!result.error) {
          setInvoices(result.data);
          setTotalCount(result.totalCount);
          paidInvoicesCacheService.setCachedList(
            cacheKey,
            result.data,
            result.totalCount
          );
          
          telemetry.logPerf('paid_load_first_data', {
            duration: performance.now() - t0,
            rows: result.data.length,
            page,
            cached: false,
          });

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
        console.error('[PaidInvoices] Error loading invoices:', err);
        
        // Log error to audit system
        await ApiErrorLogger.logSupabaseError('select', err, {
          table: 'invoices',
          userContext: 'paid_invoices_page',
        });

        setError(err.message || "An unexpected error occurred");
        toast.error("Failed to load data", {
          description: err.message,
        });
      }

      setLoading(false);
      setIsChangingPage(false);
    },
    [cacheKey, page, pageSize, searchQuery, sortField, sortDirection, filters, isInitialLoad]
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
        if (viewerOpen && !isViewerClosing) {
          setViewerOpen(false);
          handleCloseViewer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filterDrawerOpen, viewerOpen, isViewerClosing]);

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
      telemetry.logUIEvent('paid_sort', { field, direction });
      updateParams({ sortBy: field, sortDir: direction, page: "0" });
    },
    [searchParams]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      telemetry.logUIEvent('paid_pagesize_change', { oldSize: pageSize, newSize: size });
      localStorage.setItem("paidInvoicesPageSize", size.toString());
      updateParams({ pageSize: size.toString(), page: "0" });
    },
    [searchParams, pageSize]
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
      telemetry.logUIEvent('paid_filter_apply', {
        filters: newFilters,
        hasDateRange: !!(newFilters.invoiceDateFrom || newFilters.invoiceDateTo),
        hasPrice: !!(newFilters.priceMin || newFilters.priceMax),
        entityCount: newFilters.entities?.length || 0,
        supplierCount: newFilters.suppliers?.length || 0,
      });

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

  const handleInvoiceClick = useCallback((id: string) => {
    setSelectedInvoiceId(id);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setIsViewerClosing(true);
    // Defer cleanup until Dialog animation completes (200ms + 50ms buffer)
    setTimeout(() => {
      setSelectedInvoiceId(null);
      setIsViewerClosing(false);
    }, 250);
  }, []);

  const handleSupplierClick = useCallback(
    (supplier: string) => {
      telemetry.logUIEvent('paid_supplier_filter_from_viewer', { supplier });
      updateParams({ 
        suppliers: supplier, 
        page: "0" 
      });
      toast.success("Filter applied", {
        description: `Showing invoices from ${supplier}`,
      });
    },
    [searchParams]
  );

  const handleExport = useCallback(
    async (format: 'csv' | 'xlsx', columns: ExportColumn[], dateRange: { from?: string; to?: string }) => {
      try {
        telemetry.logUIEvent('paid_export', {
          format,
          columnCount: columns.length,
          hasFilters: Object.keys(filters).length > 0,
        });

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

        telemetry.logUIEvent('paid_export_success', {
          format,
          rowCount: result.data.length,
        });
      } catch (err: any) {
        console.error('[PaidInvoices] Export failed:', err);
        
        await ApiErrorLogger.logSupabaseError('export', err, {
          table: 'invoices',
          userContext: 'paid_invoices_export',
        });

        toast.error('Export failed', {
          description: err.message || 'An unexpected error occurred',
        });
      }
    },
    [searchQuery, sortField, sortDirection, filters]
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const selectedInvoice = selectedInvoiceId 
    ? invoices.find(inv => inv.id === selectedInvoiceId) || null
    : null;

  // Check if selected invoice is locked by another user using the lock service
  const { isLockedByOther, lockedByUser } = useInvoiceLock(selectedInvoiceId || undefined);

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

      <div ref={scrollContainerRef} className="flex-1 overflow-auto max-w-full">
        {/* Hide table when viewer is open or closing to prevent expensive re-renders */}
        {selectedInvoiceId === null && !isViewerClosing ? (
          isInitialLoad ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </div>
          ) : (
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
          )
        ) : (
          <div className="flex-1 bg-muted/30" />
        )}
      </div>

      <PaidInvoicesFilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <PaidInvoiceViewer
        invoice={selectedInvoice}
        open={viewerOpen}
        onOpenChange={(open) => {
          if (!open && !isViewerClosing) {
            setViewerOpen(false);
            handleCloseViewer();
          }
        }}
        isLockedByOther={isLockedByOther}
        lockedByUser={lockedByUser}
        onSupplierClick={handleSupplierClick}
        closing={isViewerClosing || !viewerOpen}
        onInvoiceUpdated={(updatedInvoice) => {
          console.log('[PaidInvoices] Invoice updated in viewer:', updatedInvoice.id);
          paidInvoicesCacheService.invalidateAll();
          loadInvoices(false);
          toast.success('Invoice updated', {
            description: 'Changes saved successfully',
          });
        }}
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

      {/* Real-time notifications for invoice updates */}
      <RealtimeNotifications 
        viewState="paid" 
        onInvoiceListUpdate={() => {
          // Invalidate cache to force fresh fetch
          paidInvoicesCacheService.invalidateAll();
          // Reload with silent update
          loadInvoices(false);
        }} 
      />
    </div>
  );
}
