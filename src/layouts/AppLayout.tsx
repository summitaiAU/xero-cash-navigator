import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice, InvoiceViewState } from "@/types/invoice";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type AppLayoutContext = {
  refreshSidebarCounts: () => Promise<void>;
};

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === null ? true : stored === "true";
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reviewCount, setReviewCount] = useState(0);

  // Derive current view from URL
  const searchParams = new URLSearchParams(location.search);
  const viewState = (searchParams.get("view") as InvoiceViewState) || "payable";

  const refreshSidebarCounts = useCallback(async (signal?: AbortSignal) => {
    const fetchInvoices = async () => {
      try {
        const query = supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false });
        const { data, error } = signal
          ? await query.abortSignal(signal)
          : await query;

        if (signal?.aborted) return;
        if (error) throw error;
        setInvoices((data as Invoice[] | null) || []);
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return;
        console.error("Error fetching invoices:", error);
      }
    };

    const fetchReviewCount = async () => {
      try {
        const query = supabase
          .from("email_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "review");
        const { count, error } = signal
          ? await query.abortSignal(signal)
          : await query;

        if (signal?.aborted) return;
        if (error) throw error;
        setReviewCount(count || 0);
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return;
        console.error("Error fetching review count:", error);
      }
    };

    await Promise.all([fetchInvoices(), fetchReviewCount()]);
  }, []);

  // Fetch all invoices for counts
  useEffect(() => {
    const abortController = new AbortController();

    refreshSidebarCounts(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [refreshSidebarCounts]);

  const outletContext = useMemo<AppLayoutContext>(() => ({
    refreshSidebarCounts: () => refreshSidebarCounts(),
  }), [refreshSidebarCounts]);

  // Calculate counts
  const { payableCount, foreignCount, paidCount, flaggedCount } = useMemo(() => {
    const payableStatusInvoices = invoices.filter(
      (inv) => inv.status !== "PAID" && inv.status !== "FLAGGED" && inv.status !== "DELETED"
    );
    const payable = payableStatusInvoices.filter((inv) => inv.is_foreign !== true).length;
    const foreign = payableStatusInvoices.filter((inv) => inv.is_foreign === true).length;
    const paid = invoices.filter(
      (inv) => inv.status === "PAID"
    ).length;
    const flagged = invoices.filter((inv) => inv.status === "FLAGGED").length;

    return { payableCount: payable, foreignCount: foreign, paidCount: paid, flaggedCount: flagged };
  }, [invoices]);

  const handleToggleSidebar = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem("sidebar-collapsed", String(newCollapsed));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      {/* Hide sidebar on mobile (< 1024px) */}
      {!isMobile && (
        <SimpleSidebar
          viewState={viewState}
          onViewStateChange={() => {}} // Navigation handled by SimpleSidebar internally
          payableCount={payableCount}
          foreignCount={foreignCount}
          paidCount={paidCount}
          flaggedCount={flaggedCount}
          reviewCount={reviewCount}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onSignOut={handleSignOut}
          userName={user?.email}
        />
      )}
      <main className={cn(
        "flex-1 min-w-0 h-full relative overflow-hidden transition-all duration-300",
        // Only add left padding for desktop when sidebar is visible
        !isMobile && (sidebarCollapsed ? "pl-16" : "pl-48")
      )}>
        <React.Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          }
        >
          <Outlet context={outletContext} />
        </React.Suspense>
      </main>
    </div>
  );
};
