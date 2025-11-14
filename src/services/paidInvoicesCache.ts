import { Invoice } from "@/types/invoice";

interface CachedList {
  data: Invoice[];
  totalCount: number;
  timestamp: number;
}

interface CachedInvoice {
  data: Invoice;
  timestamp: number;
}

interface CacheStore {
  lists: Map<string, CachedList>;
  invoices: Map<string, CachedInvoice>;
  scrollPositions: Map<string, number>;
  invoiceIdIndex: Map<string, string>; // invoiceId -> cacheKey
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class PaidInvoicesCacheService {
  private cache: CacheStore = {
    lists: new Map(),
    invoices: new Map(),
    scrollPositions: new Map(),
    invoiceIdIndex: new Map(),
  };

  /**
   * Generate a stable cache key from filters/sort/pagination
   */
  generateCacheKey(params: {
    page: number;
    pageSize: number;
    searchQuery: string;
    sortField: string;
    sortDirection: string;
    filters: any;
  }): string {
    return `paid-${JSON.stringify(params)}`;
  }

  /**
   * Check if cached data is stale
   */
  isStale(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_TTL;
  }

  /**
   * Get cached list
   */
  getCachedList(cacheKey: string): CachedList | null {
    const cached = this.cache.lists.get(cacheKey);
    if (!cached) return null;
    
    if (this.isStale(cached.timestamp)) {
      this.cache.lists.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  /**
   * Set cached list and prewarm single-invoice cache
   */
  setCachedList(cacheKey: string, data: Invoice[], totalCount: number): void {
    this.cache.lists.set(cacheKey, {
      data,
      totalCount,
      timestamp: Date.now(),
    });
    
    // Index invoices for O(1) lookup of which list contains an invoice
    data.forEach((inv) => {
      this.cache.invoiceIdIndex.set(inv.id, cacheKey);
    });
    
    // Prewarm single-invoice cache from list data
    this.prewarmCache(data);
  }
  
  /**
   * Get invoice from any cached list
   */
  getCachedInvoiceFromList(invoiceId: string): Invoice | null {
    const cacheKey = this.cache.invoiceIdIndex.get(invoiceId);
    if (cacheKey) {
      const cached = this.cache.lists.get(cacheKey);
      if (cached && !this.isStale(cached.timestamp)) {
        const found = cached.data.find((inv) => inv.id === invoiceId);
        if (found) return found;
      }
    }
    return null;
  }
  
  /**
   * Prewarm single-invoice cache from list data
   */
  prewarmCache(invoices: Invoice[]): void {
    const timestamp = Date.now();
    invoices.forEach(invoice => {
      if (!this.cache.invoices.has(invoice.id)) {
        this.cache.invoices.set(invoice.id, {
          data: invoice,
          timestamp,
        });
      }
    });
  }

  /**
   * Get cached single invoice
   */
  getCachedInvoice(invoiceId: string): Invoice | null {
    const cached = this.cache.invoices.get(invoiceId);
    if (!cached) return null;
    
    if (this.isStale(cached.timestamp)) {
      this.cache.invoices.delete(invoiceId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cached single invoice
   */
  setCachedInvoice(invoiceId: string, invoice: Invoice): void {
    this.cache.invoices.set(invoiceId, {
      data: invoice,
      timestamp: Date.now(),
    });
  }

  /**
   * Get scroll position for a cache key
   */
  getScrollPosition(cacheKey: string): number {
    return this.cache.scrollPositions.get(cacheKey) || 0;
  }

  /**
   * Set scroll position for a cache key
   */
  setScrollPosition(cacheKey: string, position: number): void {
    this.cache.scrollPositions.set(cacheKey, position);
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    this.cache.lists.clear();
    this.cache.invoices.clear();
    this.cache.scrollPositions.clear();
    this.cache.invoiceIdIndex.clear();
  }

  /**
   * Invalidate list caches only
   */
  invalidateLists(): void {
    this.cache.lists.clear();
    this.cache.invoiceIdIndex.clear();
  }
}

export const paidInvoicesCacheService = new PaidInvoicesCacheService();
