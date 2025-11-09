import React from "react";

export default function PaidInvoices() {
  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">Paid Invoices - Loading...</h1>
    </div>
  );
}

/*
// TEMPORARILY DISABLED TO DEBUG
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PaidInvoicesTopBar } from "@/components/paid/PaidInvoicesTopBar";
import { PaidInvoicesTable } from "@/components/paid/PaidInvoicesTable";
import { PaidInvoicesFilterDrawer } from "@/components/paid/PaidInvoicesFilterDrawer";
import { PaidInvoiceViewer } from "@/components/paid/PaidInvoiceViewer";
import { Invoice } from "@/types/invoice";
import {
  fetchPaidInvoices,
  prefetchPaidInvoicesPage,
  PaidInvoicesFilters,
} from "@/services/paidInvoicesService";
import { paidInvoicesCacheService } from "@/services/paidInvoicesCache";

function PaidInvoicesFull() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
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
    async (showLoading = true) => {
      if (showLoading) setLoading(true);

      // Check cache first
      const cached = paidInvoicesCacheService.getCachedList(cacheKey);
      if (cached) {
        setInvoices(cached.data);
        setTotalCount(cached.totalCount);
        if (showLoading) setLoading(false);
      }

      // Fetch fresh data (stale-while-revalidate)
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
      }

      setLoading(false);
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

  // Save scroll position on unmount or navigation
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
    },
    [searchParams]
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
  }, [searchParams]);

  const handleInvoiceClick = useCallback(
    (id: string) => {
      updateParams({ invoiceId: id });
    },
    [searchParams]
  );

  const handleCloseViewer = useCallback(() => {
    updateParams({ invoiceId: null });
  }, [searchParams]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="h-screen flex flex-col bg-background">
      <PaidInvoicesTopBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        onOpenFilters={() => setFilterDrawerOpen(true)}
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
      />
    </div>
  );
}
*/
