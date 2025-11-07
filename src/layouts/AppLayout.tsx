import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate, useNavigation } from "react-router-dom";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/types/invoice";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation(); // Track route transitions
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === null ? true : stored === "true";
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reviewCount, setReviewCount] = useState(0);

  // Determine if route is loading
  const isRouteLoading = navigation.state === "loading";

  // Derive current view from URL
  const searchParams = new URLSearchParams(location.search);
  const viewState = (searchParams.get("view") as "payable" | "paid" | "flagged") || "payable";

  // Fetch all invoices for counts
  useEffect(() => {
    const abortController = new AbortController();

    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .abortSignal(abortController.signal);

        if (abortController.signal.aborted) return;
        if (error) throw error;
        setInvoices((data as any) || []);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Error fetching invoices:", error);
      }
    };

    const fetchReviewCount = async () => {
      try {
        const { count, error } = await supabase
          .from("email_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "review")
          .abortSignal(abortController.signal);

        if (abortController.signal.aborted) return;
        if (error) throw error;
        setReviewCount(count || 0);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Error fetching review count:", error);
      }
    };

    fetchInvoices();
    fetchReviewCount();

    return () => {
      abortController.abort();
    };
  }, []);

  // Calculate counts
  const { payableCount, paidCount, flaggedCount } = useMemo(() => {
    const payable = invoices.filter(
      (inv) => inv.status !== "PAID" && inv.status !== "FLAGGED" && inv.status !== "DELETED"
    ).length;
    const paid = invoices.filter(
      (inv) => inv.status === "PAID"
    ).length;
    const flagged = invoices.filter((inv) => inv.status === "FLAGGED").length;

    return { payableCount: payable, paidCount: paid, flaggedCount: flagged };
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
      <SimpleSidebar
        viewState={viewState}
        onViewStateChange={() => {}} // Navigation handled by SimpleSidebar internally
        payableCount={payableCount}
        paidCount={paidCount}
        flaggedCount={flaggedCount}
        reviewCount={reviewCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSignOut={handleSignOut}
        userName={user?.email}
      />
      <main className={cn(
        "flex-1 min-w-0 h-full relative overflow-hidden transition-all duration-300",
        sidebarCollapsed ? "pl-16" : "pl-48"
      )}>
        {/* Route transition loading overlay */}
        {isRouteLoading && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
        
        <React.Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading page...</p>
              </div>
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  );
};
