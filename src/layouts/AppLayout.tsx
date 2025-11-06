import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/types/invoice";

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Derive current view from URL
  const searchParams = new URLSearchParams(location.search);
  const viewState = (searchParams.get("view") as "payable" | "paid" | "flagged") || "payable";

  // Fetch all invoices for counts
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setInvoices(data as any as Invoice[] || []);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      }
    };

    fetchInvoices();
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
    <div className="min-h-screen w-full flex bg-background">
      <SimpleSidebar
        viewState={viewState}
        onViewStateChange={() => {}} // Navigation handled by SimpleSidebar internally
        payableCount={payableCount}
        paidCount={paidCount}
        flaggedCount={flaggedCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSignOut={handleSignOut}
        userName={user?.email}
      />
      <main className="flex-1 min-w-0 relative">
        <React.Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground border-t-transparent" />
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  );
};
