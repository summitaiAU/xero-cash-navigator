import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/invoice";
import { paidInvoicesCacheService } from "./paidInvoicesCache";
import { telemetry } from "./telemetry";
import { ApiErrorLogger } from "./apiErrorLogger";

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export interface PaidInvoicesFilters {
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  paidDateFrom?: string;
  paidDateTo?: string;
  priceMin?: number;
  priceMax?: number;
  entities?: string[];
  statuses?: string[];
  suppliers?: string[];
}

export interface FetchPaidInvoicesParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  filters?: PaidInvoicesFilters;
}

/**
 * Fetch paginated, filtered, sorted paid invoices
 */
export async function fetchPaidInvoices({
  page = 0,
  pageSize = 50,
  searchQuery = "",
  sortField = "paid_date",
  sortDirection = "desc",
  filters = {},
}: FetchPaidInvoicesParams): Promise<{
  data: Invoice[];
  totalCount: number;
  error: Error | null;
}> {
  const t0 = performance.now();
  
  try {
    const offset = page * pageSize;

    // Build query
    let query = supabase.from("invoices").select("*", { count: "exact" });

    // Status filter - default to PAID, but allow additional statuses from filters
    const statusFilters = filters.statuses || ["PAID"];
    if (statusFilters.length === 1) {
      query = query.eq("status", statusFilters[0]);
    } else {
      query = query.in("status", statusFilters);
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = query.or(
        `invoice_no.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`
      );
    }

    // Date filters
    if (filters.invoiceDateFrom) {
      query = query.gte("invoice_date", filters.invoiceDateFrom);
    }
    if (filters.invoiceDateTo) {
      query = query.lte("invoice_date", filters.invoiceDateTo);
    }
    if (filters.paidDateFrom) {
      query = query.gte("paid_date", filters.paidDateFrom);
    }
    if (filters.paidDateTo) {
      query = query.lte("paid_date", filters.paidDateTo);
    }

    // Price range
    if (filters.priceMin !== undefined) {
      query = query.gte("total_amount", filters.priceMin);
    }
    if (filters.priceMax !== undefined) {
      query = query.lte("total_amount", filters.priceMax);
    }

    // Entity filter
    if (filters.entities && filters.entities.length > 0) {
      query = query.in("entity", filters.entities);
    }

    // Supplier filter
    if (filters.suppliers && filters.suppliers.length > 0) {
      query = query.in("supplier_name", filters.suppliers);
    }

    // Sorting
    const nullsLast = sortDirection === "desc";
    query = query.order(sortField, {
      ascending: sortDirection === "asc",
      nullsFirst: !nullsLast,
    });

    // Pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching paid invoices:", error);
      
      await ApiErrorLogger.logSupabaseError('select', error, {
        table: 'invoices',
        userContext: 'paid_invoices_fetch',
      });

      throw new Error(`Failed to fetch paid invoices: ${error.message}`);
    }

    if (!data) {
      return { data: [], totalCount: 0, error: null };
    }

    const duration = performance.now() - t0;
    telemetry.logPerf('paid_query', {
      page,
      pageSize,
      rows: data?.length || 0,
      duration,
      hasFilters: Object.keys(filters).length > 0,
    });

    // Map to Invoice interface
    const mappedInvoices: Invoice[] = data.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_no || "",
      supplier: invoice.supplier_name || "",
      amount: Number(invoice.total_amount) || 0,
      due_date: invoice.due_date || "",
      status:
        (invoice.status as
          | "READY"
          | "FLAGGED"
          | "PAID"
          | "APPROVED"
          | "PARTIALLY PAID") || "PAID",
      xero_bill_id: invoice.xero_invoice_id || "",
      drive_embed_url:
        (invoice as any).google_drive_embed_link ||
        invoice.google_drive_link ||
        "",
      drive_view_url: invoice.link_to_invoice || "",
      supplier_email: "",
      remittance_email: (invoice as any).remittance_email || undefined,
      supplier_email_on_invoice:
        (invoice as any).supplier_email_on_invoice || undefined,
      sender_email: (invoice as any).sender_email || undefined,
      remittance_sent: invoice.remittance_sent || false,
      project: invoice.project || "",
      approved: (invoice as any).approved || false,
      partially_paid: (invoice as any).partially_paid || false,
      saved_emails: (invoice as any).saved_emails || [],

      // Additional fields
      entity: invoice.entity || "",
      supplier_name: invoice.supplier_name || "",
      invoice_no: invoice.invoice_no || "",
      list_items: invoice.list_items || [],
      subtotal: Number(invoice.subtotal) || 0,
      gst: Number(invoice.gst) || 0,
      total_amount: Number(invoice.total_amount) || 0,
      amount_due: Number(invoice.amount_due) || 0,
      amount_paid: Number(invoice.amount_paid) || 0,
      invoice_date: invoice.invoice_date || "",
      currency: (invoice as any).currency || "AUD",

      // Timestamp fields
      payment_made_at: (invoice as any).payment_made_at || undefined,
      paid_date: invoice.paid_date || undefined,
      partial_payment_made_at:
        (invoice as any).partial_payment_made_at || undefined,
      remittance_sent_at: (invoice as any).remittance_sent_at || undefined,
      flag_email_sent_at: (invoice as any).flag_email_sent_at || undefined,

      xero_data: {
        invoiceNumber: invoice.invoice_no || "",
        contactName: invoice.supplier_name || "",
        issueDate: formatDate(invoice.created_at || ""),
        dueDate: formatDate(invoice.due_date || ""),
        reference: invoice.payment_ref || "",
        currency: "AUD",
        status: "DRAFT" as const,
        bsb: "N/A",
        accountNumber: "N/A",
        lineItems: invoice.list_items
          ? Array.isArray(invoice.list_items)
            ? invoice.list_items.map((item: any, index: number) => {
                const itemData =
                  typeof item === "string" ? JSON.parse(item) : item;
                return {
                  itemNumber: index + 1,
                  description: itemData.description || "",
                  quantity: Number(itemData.quantity) || 1,
                  unitAmount: Number(itemData.unit_price || itemData.total) || 0,
                  account: `${itemData.account_code || "429"} - Expenses`,
                  taxRate: "GST (10%)",
                  amount: Number(itemData.total || itemData.unit_price) || 0,
                };
              })
            : []
          : [],
        subtotal: Number(invoice.subtotal) || 0,
        totalTax: Number(invoice.gst) || 0,
        total: Number(invoice.total_amount) || 0,
      },
    }));
    
    // Prewarm single-invoice cache from list data
    paidInvoicesCacheService.prewarmCache(mappedInvoices);

    return { data: mappedInvoices, totalCount: count || 0, error: null };
  } catch (error) {
    console.error("Error fetching paid invoices:", error);
    
    await ApiErrorLogger.logSupabaseError('select', error, {
      table: 'invoices',
      userContext: 'paid_invoices_fetch',
    });

    return {
      data: [],
      totalCount: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Prefetch next page
 */
export async function prefetchPaidInvoicesPage(
  params: FetchPaidInvoicesParams
): Promise<void> {
  const nextPageParams = { ...params, page: (params.page || 0) + 1 };
  const cacheKey = paidInvoicesCacheService.generateCacheKey({
    page: nextPageParams.page || 0,
    pageSize: nextPageParams.pageSize || 50,
    searchQuery: nextPageParams.searchQuery || "",
    sortField: nextPageParams.sortField || "paid_date",
    sortDirection: nextPageParams.sortDirection || "desc",
    filters: nextPageParams.filters || {},
  });

  // Check if already cached
  if (paidInvoicesCacheService.getCachedList(cacheKey)) {
    return;
  }

  // Fetch and cache
  const result = await fetchPaidInvoices(nextPageParams);
  if (!result.error) {
    paidInvoicesCacheService.setCachedList(
      cacheKey,
      result.data,
      result.totalCount
    );
  }
}

/**
 * Fetch single invoice by ID
 */
export async function fetchInvoiceById(
  invoiceId: string
): Promise<{ data: Invoice | null; error: Error | null }> {
  try {
    // Check single-invoice cache first
    const cached = paidInvoicesCacheService.getCachedInvoice(invoiceId);
    if (cached) {
      telemetry.logUIEvent("invoice_cache_hit", { invoiceId, source: "single" });
      return { data: cached, error: null };
    }
    
    // Check if invoice exists in any cached list
    const cachedFromList = paidInvoicesCacheService.getCachedInvoiceFromList(invoiceId);
    if (cachedFromList) {
      telemetry.logUIEvent("invoice_cache_hit", { invoiceId, source: "list" });
      // Also cache it in single-invoice cache for future lookups
      paidInvoicesCacheService.setCachedInvoice(invoiceId, cachedFromList);
      return { data: cachedFromList, error: null };
    }
    
    telemetry.logUIEvent("invoice_cache_miss", { invoiceId });

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }

    if (!data) {
      return { data: null, error: new Error("Invoice not found") };
    }

    // Map to Invoice interface (same as above)
    const mappedInvoice: Invoice = {
      id: data.id,
      invoice_number: data.invoice_no || "",
      supplier: data.supplier_name || "",
      amount: Number(data.total_amount) || 0,
      due_date: data.due_date || "",
      status:
        (data.status as "READY" | "FLAGGED" | "PAID" | "APPROVED" | "PARTIALLY PAID") ||
        "PAID",
      xero_bill_id: data.xero_invoice_id || "",
      drive_embed_url:
        (data as any).google_drive_embed_link || data.google_drive_link || "",
      drive_view_url: data.link_to_invoice || "",
      supplier_email: "",
      remittance_email: (data as any).remittance_email || undefined,
      supplier_email_on_invoice:
        (data as any).supplier_email_on_invoice || undefined,
      sender_email: (data as any).sender_email || undefined,
      remittance_sent: data.remittance_sent || false,
      project: data.project || "",
      approved: (data as any).approved || false,
      partially_paid: (data as any).partially_paid || false,
      saved_emails: (data as any).saved_emails || [],
      entity: data.entity || "",
      supplier_name: data.supplier_name || "",
      invoice_no: data.invoice_no || "",
      list_items: data.list_items || [],
      subtotal: Number(data.subtotal) || 0,
      gst: Number(data.gst) || 0,
      total_amount: Number(data.total_amount) || 0,
      amount_due: Number(data.amount_due) || 0,
      amount_paid: Number(data.amount_paid) || 0,
      invoice_date: data.invoice_date || "",
      currency: (data as any).currency || "AUD",
      payment_made_at: (data as any).payment_made_at || undefined,
      paid_date: data.paid_date || undefined,
      partial_payment_made_at: (data as any).partial_payment_made_at || undefined,
      remittance_sent_at: (data as any).remittance_sent_at || undefined,
      flag_email_sent_at: (data as any).flag_email_sent_at || undefined,
      xero_data: {
        invoiceNumber: data.invoice_no || "",
        contactName: data.supplier_name || "",
        issueDate: formatDate(data.created_at || ""),
        dueDate: formatDate(data.due_date || ""),
        reference: data.payment_ref || "",
        currency: "AUD",
        status: "DRAFT" as const,
        bsb: "N/A",
        accountNumber: "N/A",
        lineItems: data.list_items
          ? Array.isArray(data.list_items)
            ? data.list_items.map((item: any, index: number) => {
                const itemData =
                  typeof item === "string" ? JSON.parse(item) : item;
                return {
                  itemNumber: index + 1,
                  description: itemData.description || "",
                  quantity: Number(itemData.quantity) || 1,
                  unitAmount: Number(itemData.unit_price || itemData.total) || 0,
                  account: `${itemData.account_code || "429"} - Expenses`,
                  taxRate: "GST (10%)",
                  amount: Number(itemData.total || itemData.unit_price) || 0,
                };
              })
            : []
          : [],
        subtotal: Number(data.subtotal) || 0,
        totalTax: Number(data.gst) || 0,
        total: Number(data.total_amount) || 0,
      },
    };

    // Cache the result
    paidInvoicesCacheService.setCachedInvoice(invoiceId, mappedInvoice);

    return { data: mappedInvoice, error: null };
  } catch (error) {
    console.error("Error fetching invoice by ID:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fetch unique entities for filter
 */
export async function fetchUniqueEntities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("entity")
      .eq("status", "PAID")
      .not("entity", "is", null);

    if (error) throw error;

    const uniqueEntities = [...new Set(data.map((d) => d.entity))].filter(
      Boolean
    ) as string[];
    return uniqueEntities.sort();
  } catch (error) {
    console.error("Error fetching unique entities:", error);
    return [];
  }
}

/**
 * Fetch unique suppliers for filter
 */
export async function fetchUniqueSuppliers(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("supplier_name")
      .eq("status", "PAID")
      .not("supplier_name", "is", null);

    if (error) throw error;

    const uniqueSuppliers = [
      ...new Set(data.map((d) => d.supplier_name)),
    ].filter(Boolean) as string[];
    return uniqueSuppliers.sort();
  } catch (error) {
    console.error("Error fetching unique suppliers:", error);
    return [];
  }
}
