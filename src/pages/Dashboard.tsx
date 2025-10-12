import React, { useState, useEffect } from "react";
import { PDFViewer } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { PaymentSection } from "@/components/PaymentSection";
import { PaidInvoiceSection } from "@/components/PaidInvoiceSection";
import { InvoiceNavigation } from "@/components/InvoiceNavigation";
import { CompletionScreen } from "@/components/CompletionScreen";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { AddInvoiceButton } from "@/components/AddInvoiceButton";
import { UserPresenceIndicator } from "@/components/UserPresenceIndicator";
import { ConflictWarning } from "@/components/ConflictWarning";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { Invoice, ProcessingStatus, PaymentData } from "@/types/invoice";
import {
  fetchInvoices,
  updateInvoicePaymentStatus,
  updateInvoiceRemittanceStatus,
  flagInvoice,
} from "@/services/invoiceService";
import { invoiceService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserPresence } from "@/hooks/useUserPresence";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import SodhiLogo from "@/assets/sodhi-logo.svg";
import { FlaggedInvoiceSection } from "@/components/FlaggedInvoiceSection";
import { useSafeOffsets } from "@/hooks/useSafeOffsets";

export const Dashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]); // All invoices for search
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedInvoices, setCompletedInvoices] = useState<Set<string>>(new Set());
  const [xeroLoadingStates, setXeroLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    xeroSynced: false,
    paymentUploaded: false,
    remittanceSent: false,
  });
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [viewState, setViewState] = useState<"payable" | "paid" | "flagged">("payable");
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Current invoice for easy access
  const currentInvoice = invoices[currentIndex];

  // Multi-user presence tracking
  const { usersOnCurrentInvoice, isCurrentInvoiceBeingEdited } = useUserPresence({
    currentInvoiceId: currentInvoice?.id,
    isEditing: false, // We'll update this based on actual editing state
  });

  // Desktop fixed layout measurements
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const navRef = React.useRef<HTMLDivElement | null>(null);
  const rightScrollRef = React.useRef<HTMLDivElement | null>(null);
  const desktopOffset = useSafeOffsets(headerRef.current, navRef.current, { headerFallback: 64, navFallback: 56 });

  const handleSignOut = async () => {
    try {
      // Log the sign out action before actually signing out
      try {
        const { auditService } = await import("@/services/auditService");
        await auditService.logSignOut();
      } catch (error) {
        console.error("Failed to log sign out:", error);
        // Don't prevent sign out if audit logging fails
      }

      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load invoices from Supabase on mount and when filter changes
  const loadInvoices = async (showToast = false) => {
    console.log("Loading invoices...", viewState);
    try {
      setLoading(true);
      const fetchedInvoices = await fetchInvoices(viewState);
      console.log("Fetched invoices:", fetchedInvoices.length);
      setInvoices(fetchedInvoices);
      setCurrentIndex(0); // Reset to first invoice when switching views
      setCompletedInvoices(new Set()); // Reset completed tracking

      if (showToast) {
        toast({
          title: "Invoices Refreshed",
          description: "Invoice list has been updated with latest changes.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to load invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all invoices for search functionality
  const loadAllInvoices = async () => {
    try {
      const [payable, paid, flagged] = await Promise.all([
        fetchInvoices("payable"),
        fetchInvoices("paid"),
        fetchInvoices("flagged"),
      ]);
      setAllInvoices([...payable, ...paid, ...flagged]);
    } catch (error) {
      console.error("Failed to load all invoices for search:", error);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadAllInvoices(); // Load all invoices for search
  }, [toast, viewState]);

  // Load Xero data for current invoice when it changes
  useEffect(() => {
    if (currentInvoice && currentInvoice.xero_bill_id && !currentInvoice.xero_data) {
      loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id);
    }
  }, [currentInvoice]);
  const isCompleted = currentInvoice && completedInvoices.has(currentInvoice.id);
  const allCompleted = invoices.length > 0 && completedInvoices.size === invoices.length;
  const isXeroLoading = currentInvoice ? xeroLoadingStates.get(currentInvoice.id) || false : false;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with form inputs
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "?":
          e.preventDefault();
          showKeyboardShortcuts();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, invoices.length]);

  // Touch/swipe handling for mobile
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startX || !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = startX - endX;
      const diffY = startY - endY;

      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          handleNext(); // Swipe left = next
        } else {
          handlePrevious(); // Swipe right = previous
        }
      }

      startX = 0;
      startY = 0;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentIndex, invoices.length]);

  const showKeyboardShortcuts = () => {
    toast({
      title: "Keyboard Shortcuts",
      description: "← → Navigate invoices | ? Show this help",
    });
  };

  const handleNext = () => {
    if (currentIndex < invoices.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetProcessingStatus();
      scrollToTop();
      setShowSuccessOverlay(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetProcessingStatus();
      scrollToTop();
    }
  };

  const resetProcessingStatus = () => {
    setProcessingStatus({
      xeroSynced: false,
      paymentUploaded: false,
      remittanceSent: false,
    });
  };

  const scrollToTop = () => {
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const loadXeroData = async (invoiceId: string, xeroInvoiceId: string) => {
    setXeroLoadingStates((prev) => new Map(prev.set(invoiceId, true)));

    try {
      const xeroData = await invoiceService.getXeroData(xeroInvoiceId);

      // Update the invoice in state with fetched Xero data
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, xero_data: { ...inv.xero_data, ...xeroData } } : inv)),
      );
    } catch (error) {
      console.error(`Failed to fetch Xero data for invoice ${invoiceId}:`, error);
      toast({
        title: "Xero Data Error",
        description: `Failed to load Xero data for this invoice.`,
        variant: "destructive",
      });
    } finally {
      setXeroLoadingStates((prev) => new Map(prev.set(invoiceId, false)));
    }
  };

  const handleXeroUpdate = async (updatedInvoice: any) => {
    if (!currentInvoice) return;

    try {
      // Refresh the entire invoice list to get the latest data from the database
      const refreshedInvoices = await fetchInvoices(viewState);
      setInvoices(refreshedInvoices);

      // Find the updated invoice in the refreshed list to ensure we have the latest version
      const latestInvoice = refreshedInvoices.find((inv) => inv.id === updatedInvoice.id);

      if (latestInvoice) {
        // Update local state with the fresh data from database
        setInvoices((prevInvoices) =>
          prevInvoices.map((invoice) => (invoice.id === latestInvoice.id ? latestInvoice : invoice)),
        );
      }

      setProcessingStatus((prev) => ({ ...prev, xeroSynced: true }));
    } catch (error) {
      console.error("Failed to refresh invoice data after update:", error);
      // Fallback to just updating local state if refresh fails
      setInvoices((prevInvoices) =>
        prevInvoices.map((invoice) => (invoice.id === updatedInvoice.id ? updatedInvoice : invoice)),
      );
      setProcessingStatus((prev) => ({ ...prev, xeroSynced: true }));
    }
  };

  const handleMarkAsPaid = async (paymentData: PaymentData) => {
    if (!currentInvoice) return;

    setLoading(true);
    try {
      // Update invoice status in Supabase - remittance sent only if email provided
      const remittanceSent = !!paymentData.email;
      await updateInvoicePaymentStatus(currentInvoice.id, remittanceSent);

      // Update the invoice in state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === currentInvoice.id ? { ...inv, status: "PAID" as const, remittance_sent: remittanceSent } : inv,
        ),
      );

      // Mark as completed
      setCompletedInvoices((prev) => new Set([...prev, currentInvoice.id]));
      setProcessingStatus((prev) => ({
        ...prev,
        paymentUploaded: true,
        remittanceSent: remittanceSent,
      }));

      // Show success overlay temporarily
      setShowSuccessOverlay(true);

      toast({
        title: "Payment processed!",
        description: `Invoice ${currentInvoice.invoice_number} marked as paid.`,
      });

      // Auto-advance after 2 seconds
      setTimeout(() => {
        setShowSuccessOverlay(false);
        if (currentIndex < invoices.length - 1) {
          handleNext();
        }
      }, 2000);

      // Reset scroll immediately when marked as paid
      scrollToTop();
    } catch (error) {
      console.error("Failed to process payment:", error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleReprocessPayment = async () => {
    if (!currentInvoice) return;

    // Remove from completed invoices to allow reprocessing
    setCompletedInvoices((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentInvoice.id);
      return newSet;
    });

    // Reset processing status
    resetProcessingStatus();

    toast({
      title: "Invoice reopened",
      description: "You can now reprocess this payment.",
    });
  };

  const handleRemittanceSent = async (invoiceId: string) => {
    try {
      // Update remittance status in Supabase
      await updateInvoiceRemittanceStatus(invoiceId);

      // Update the invoice in state
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, remittance_sent: true } : inv)));

      toast({
        title: "Remittance status updated",
        description: "Invoice remittance has been marked as sent.",
      });
    } catch (error) {
      console.error("Failed to update remittance status:", error);
      toast({
        title: "Error",
        description: "Failed to update remittance status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompletedInvoices(new Set());
    resetProcessingStatus();
  };

  const handleViewStateChange = (state: "payable" | "paid" | "flagged") => {
    setViewState(state);
  };

  const handleFlagInvoice = async (invoiceId: string) => {
    try {
      // Reload invoices to reflect the flagged status
      const fetchedInvoices = await fetchInvoices(viewState);
      setInvoices(fetchedInvoices);

      toast({
        title: "Invoice Flagged",
        description: "Invoice has been flagged successfully",
      });
    } catch (error) {
      console.error("Failed to reload invoices after flagging:", error);
    }
  };

  const handleResolveFlag = async () => {
    try {
      // Reload invoices to reflect the resolved status
      const fetchedInvoices = await fetchInvoices(viewState);
      setInvoices(fetchedInvoices);

      // If this was the last invoice in flagged view, handle navigation
      if (fetchedInvoices.length === 0 && viewState === "flagged") {
        setCurrentIndex(0);
      } else if (currentIndex >= fetchedInvoices.length) {
        setCurrentIndex(Math.max(0, fetchedInvoices.length - 1));
      }
    } catch (error) {
      console.error("Failed to reload invoices after resolving:", error);
    }
  };

  const handleJumpToInvoice = (index: number) => {
    setCurrentIndex(index);
    resetProcessingStatus();
    scrollToTop();
  };

  // Handle invoice selection from search
  const handleInvoiceSelect = (selectedInvoice: Invoice) => {
    // Determine which view the invoice belongs to and switch if necessary
    let targetView: "payable" | "paid" | "flagged" = "payable";

    if (selectedInvoice.status === "PAID") {
      targetView = "paid";
    } else if (selectedInvoice.status === "FLAGGED") {
      targetView = "flagged";
    } else {
      // For all other statuses (READY, APPROVED, PARTIALLY PAID), use payable view
      targetView = "payable";
    }

    // If we need to switch views, do it first
    if (targetView !== viewState) {
      setViewState(targetView);
      // Use a timeout to ensure the view state change is processed
      setTimeout(async () => {
        try {
          // Fetch invoices for the new view
          const newViewInvoices = await fetchInvoices(targetView);
          setInvoices(newViewInvoices);

          // Find the invoice in the new view
          const invoiceIndex = newViewInvoices.findIndex((inv) => inv.id === selectedInvoice.id);
          if (invoiceIndex !== -1) {
            setCurrentIndex(invoiceIndex);
            resetProcessingStatus();
            scrollToTop();
          }
        } catch (error) {
          console.error("Failed to load invoices for new view:", error);
        }
      }, 100);
    } else {
      // Same view, just navigate to the invoice
      const invoiceIndex = invoices.findIndex((inv) => inv.id === selectedInvoice.id);
      if (invoiceIndex !== -1) {
        setCurrentIndex(invoiceIndex);
        resetProcessingStatus();
        scrollToTop();
      }
    }
  };

  const handleExportReport = () => {
    const reportData = invoices.map((invoice) => ({
      invoice_number: invoice.invoice_number,
      supplier: invoice.supplier,
      amount: invoice.amount,
      status: completedInvoices.has(invoice.id) ? "PAID" : "PENDING",
      processed_at: completedInvoices.has(invoice.id) ? new Date().toISOString() : null,
    }));

    const csv = [
      ["Invoice Number", "Supplier", "Amount", "Status", "Processed At"],
      ...reportData.map((row) => [
        row.invoice_number,
        row.supplier,
        row.amount.toString(),
        row.status,
        row.processed_at || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-processing-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "Processing report has been downloaded.",
    });
  };

  if (allCompleted) {
    return (
      <CompletionScreen
        totalProcessed={completedInvoices.size}
        onRestart={handleRestart}
        onExportReport={handleExportReport}
      />
    );
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading Invoices</h1>
          <p className="text-muted-foreground">Fetching your invoices from the database...</p>
        </div>
      </div>
    );
  }

  // Check if we have no invoices but still need to show the UI structure
  const hasNoInvoices = invoices.length === 0;

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block h-screen bg-dashboard-bg overflow-hidden">
        {/* Fixed Header */}
        <div ref={headerRef} className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-4 lg:py-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src={SodhiLogo} alt="Sodhi Logo" className="h-10 w-auto" />
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl lg:text-2xl font-semibold text-amber-700 tracking-tight">Payment Dashboard</h1>
                <p className="text-sm text-gray-600 mt-0.5">Streamline your payment workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <AddInvoiceButton onSuccess={loadInvoices} />
              <div className="hidden sm:flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                <User className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="truncate max-w-[120px] lg:max-w-none">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Fixed Navigation Bar */}
        <div
          ref={navRef}
          className="fixed left-0 right-0 bg-dashboard-bg z-20 pt-4"
          style={{ top: desktopOffset.header }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-3">
            <InvoiceNavigation
              currentIndex={currentIndex}
              totalInvoices={invoices.length}
              onPrevious={handlePrevious}
              onNext={handleNext}
              completedCount={completedInvoices.size}
              emailLink={currentInvoice?.drive_view_url}
              invoices={invoices}
              allInvoices={allInvoices}
              viewState={viewState}
              onViewStateChange={handleViewStateChange}
              onJumpToInvoice={handleJumpToInvoice}
              onInvoiceSelect={handleInvoiceSelect}
            />
          </div>
        </div>

        {/* Fixed Layout Container - Increased top spacing */}
        <div className="fixed left-0 right-0 bottom-0" style={{ top: desktopOffset.total }}>
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 h-full flex gap-6">
            {hasNoInvoices ? (
              /* No Invoices State */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    No {viewState === "paid" ? "Paid" : viewState === "flagged" ? "Flagged" : "Payable"} Invoices Found
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {viewState === "paid"
                      ? "No paid invoices are available to view."
                      : viewState === "flagged"
                        ? "No flagged invoices are available to view."
                        : "No invoices are available for processing."}
                  </p>
                  {viewState === "paid" && (
                    <p className="text-sm text-muted-foreground">Try switching to "Payable" to see unpaid invoices.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* COMPLETELY FIXED LEFT COLUMN - PDF Viewer (never scrolls) */}
                <div className="w-1/2 h-full flex-shrink-0">
                  <PDFViewer invoice={currentInvoice} />
                </div>

                {/* SCROLLABLE RIGHT COLUMN - Only this scrolls */}
                <div ref={rightScrollRef} className="w-1/2 h-full overflow-y-auto bg-dashboard-bg">
                  <div className="space-y-6 pr-2 pt-0">
                    <XeroSection
                      invoice={currentInvoice}
                      onUpdate={handleXeroUpdate}
                      onSync={() =>
                        currentInvoice.xero_bill_id && loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id)
                      }
                      loading={isXeroLoading}
                    />

                    {isCompleted ? (
                      <PaidInvoiceSection
                        invoice={currentInvoice}
                        onReprocess={handleReprocessPayment}
                        onRemittanceSent={handleRemittanceSent}
                      />
                    ) : viewState === "flagged" ? (
                      <FlaggedInvoiceSection invoice={currentInvoice} onResolve={handleResolveFlag} />
                    ) : (
                      <PaymentSection
                        invoice={currentInvoice}
                        onMarkAsPaid={handleMarkAsPaid}
                        onSkip={handleSkip}
                        onFlag={handleFlagInvoice}
                        loading={loading}
                      />
                    )}

                    {/* Delete Invoice Button - Only for payable invoices */}
                    {viewState === "payable" && currentInvoice && (
                      <DeleteInvoiceButton
                        invoice={currentInvoice}
                        onDeleted={() => {
                          // Reload invoices after deletion
                          setInvoices((prev) => prev.filter((inv) => inv.id !== currentInvoice.id));
                          // If this was the last invoice or we're at the end, go to previous
                          if (currentIndex >= invoices.length - 1 && currentIndex > 0) {
                            setCurrentIndex(currentIndex - 1);
                          }
                          toast({
                            title: "Invoice deleted",
                            description: "Invoice has been removed successfully.",
                          });
                        }}
                      />
                    )}

                    {/* Extra spacing at bottom for better scrolling */}
                    <div className="h-6"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden min-h-screen bg-dashboard-bg">
        {/* Scrollable Header for Mobile/Tablet */}
        <header className="bg-card border-b border-border shadow-soft">
          <div className="max-w-screen-2xl mx-auto px-3 md:px-4 py-2 md:py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={SodhiLogo} alt="Sodhi Logo" className="h-6 w-auto" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gradient-primary">Payment Dashboard</h1>
                <p className="text-xs text-muted-foreground">Process invoices and manage payments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-3 md:p-4 space-y-4 md:space-y-6">
          {/* Navigation - Will become floating on scroll */}
          <InvoiceNavigation
            currentIndex={currentIndex}
            totalInvoices={invoices.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            completedCount={completedInvoices.size}
            emailLink={currentInvoice?.drive_view_url}
            invoices={invoices}
            allInvoices={allInvoices}
            viewState={viewState}
            onViewStateChange={handleViewStateChange}
            onJumpToInvoice={handleJumpToInvoice}
            onInvoiceSelect={handleInvoiceSelect}
          />

          {hasNoInvoices ? (
            /* Mobile No Invoices State */
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">
                  No {viewState === "paid" ? "Paid" : viewState === "flagged" ? "Flagged" : "Payable"} Invoices Found
                </h2>
                <p className="text-muted-foreground mb-4">
                  {viewState === "paid"
                    ? "No paid invoices are available to view."
                    : viewState === "flagged"
                      ? "No flagged invoices are available to view."
                      : "No invoices are available for processing."}
                </p>
                {viewState === "paid" && (
                  <p className="text-sm text-muted-foreground">Try switching to "Payable" to see unpaid invoices.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* PDF Viewer with increased height */}
              <div className="h-[60vh] md:h-[75vh]">
                <PDFViewer invoice={currentInvoice} />
              </div>

              {/* Real-time notifications component */}
              <RealtimeNotifications viewState={viewState} onInvoiceListUpdate={() => loadInvoices(true)} />

              {/* Conflict warning for multi-user scenarios */}
              {currentInvoice && (
                <ConflictWarning
                  invoiceId={currentInvoice.id}
                  isEditing={false} // This would be updated based on actual editing state
                />
              )}

              {/* Real-time notifications component */}
              <RealtimeNotifications viewState={viewState} onInvoiceListUpdate={() => loadInvoices(true)} />

              {/* Conflict warning for multi-user scenarios */}
              {currentInvoice && (
                <ConflictWarning
                  invoiceId={currentInvoice.id}
                  isEditing={false} // This would be updated based on actual editing state
                />
              )}

              <XeroSection
                invoice={currentInvoice}
                onUpdate={handleXeroUpdate}
                onSync={() =>
                  currentInvoice.xero_bill_id && loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id)
                }
                loading={isXeroLoading}
              />

              {isCompleted ? (
                <PaidInvoiceSection
                  invoice={currentInvoice}
                  onReprocess={handleReprocessPayment}
                  onRemittanceSent={handleRemittanceSent}
                />
              ) : viewState === "flagged" ? (
                <FlaggedInvoiceSection invoice={currentInvoice} onResolve={handleResolveFlag} />
              ) : (
                <PaymentSection
                  invoice={currentInvoice}
                  onMarkAsPaid={handleMarkAsPaid}
                  onSkip={handleSkip}
                  onFlag={handleFlagInvoice}
                  loading={loading}
                />
              )}

              {/* Delete Invoice Button - Only for payable invoices (Mobile) */}
              {viewState === "payable" && currentInvoice && (
                <DeleteInvoiceButton
                  invoice={currentInvoice}
                  onDeleted={() => {
                    // Reload invoices after deletion
                    setInvoices((prev) => prev.filter((inv) => inv.id !== currentInvoice.id));
                    // If this was the last invoice or we're at the end, go to previous
                    if (currentIndex >= invoices.length - 1 && currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                    }
                    toast({
                      title: "Invoice deleted",
                      description: "Invoice has been removed successfully.",
                    });
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Success Overlay - Only show temporarily after payment */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-8 rounded-lg shadow-large text-center animate-fade-in">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Invoice Processed!</h3>
            <p className="text-muted-foreground">{currentInvoice.invoice_number} has been marked as paid.</p>
          </div>
        </div>
      )}

      {/* Global Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-card px-3 py-2 rounded-lg shadow-soft border border-border">
        Press ? for keyboard shortcuts
      </div>
    </>
  );
};
