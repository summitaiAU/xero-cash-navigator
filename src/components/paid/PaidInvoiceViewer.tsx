import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PDFViewer, PDFViewerHandle } from "@/components/PDFViewer";
import { XeroSection } from "@/components/XeroSection";
import { Invoice } from "@/types/invoice";
import { fetchInvoiceById, prefetchInvoiceById } from "@/services/paidInvoicesService";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { telemetry } from "@/services/telemetry";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiErrorLogger } from "@/services/apiErrorLogger";
import { runtimeDebugContext } from "@/services/runtimeDebugContext";
import { stallMonitor } from "@/services/stallMonitor";
import { pdfSafeModeService } from "@/services/pdfSafeMode";
import { hardCleanupBeforeInvoiceNavigation } from "@/services/navigationCleanup";
interface PaidInvoiceViewerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceIds?: string[];
  onNavigate?: (invoiceId: string) => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const sydneyTime = toZonedTime(new Date(dateString), "Australia/Sydney");
  return format(sydneyTime, "dd/MM/yyyy");
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string; border: string; text: string }> = {
    PAID: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    "PARTIALLY PAID": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    FLAGGED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
    READY: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" },
  };

  const config = statusConfig[status] || { bg: "bg-muted", border: "border-border", text: "text-foreground" };

  return (
    <Badge className={`px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.border} ${config.text}`}>
      {status}
    </Badge>
  );
};

type LoadingPhase = 'idle' | 'cleanup' | 'fetching-data' | 'data-ready' | 'mounting-pdf' | 'complete';

export function PaidInvoiceViewer({
  invoiceId,
  open,
  onOpenChange,
  invoiceIds = [],
  onNavigate,
}: PaidInvoiceViewerProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle');
  const [isInCooldown, setIsInCooldown] = useState(false);
  
  const { toast } = useToast();
  
  // Refs for cleanup hooks
  const pdfRef = useRef<PDFViewerHandle | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  
  // Request coordination to prevent race conditions
  const requestIdRef = useRef<number>(0);
  const lastNavigationRef = useRef<number>(0);
  const navBurstRef = useRef<number[]>([]);
  const warningCountRef = useRef<number>(0);
  const invoiceIdsRef = useRef<string[]>(invoiceIds); // Stable ref for navigation after cache clear
  const currentIndex = invoiceId ? invoiceIdsRef.current.indexOf(invoiceId) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < invoiceIdsRef.current.length - 1;

  // Update invoiceIdsRef when props change
  useEffect(() => {
    invoiceIdsRef.current = invoiceIds;
  }, [invoiceIds]);

  // Start/stop stall monitor on mount/unmount
  useEffect(() => {
    if (open) {
      stallMonitor.start();
      
      const unsubscribe = stallMonitor.subscribe({
        onStallDetected: (metrics) => {
          console.warn('[PaidInvoiceViewer] Stall detected during viewer', {
            lag: metrics.eventLoopLag,
            loadingPhase,
            isNavigating,
            invoiceId,
          });
          
          // If stall occurs during PDF mounting phase, enable safe mode
          if (loadingPhase === 'mounting-pdf' && metrics.eventLoopLag > 300) {
            pdfSafeModeService.enable(`Stall during PDF mount: ${metrics.eventLoopLag.toFixed(0)}ms lag`);
            
            toast({
              title: "PDF Safe Mode Enabled",
              description: "PDF rendering temporarily disabled to prevent freezing.",
              variant: "default",
            });
          }
        },
        onRecovery: () => {
          console.log('[PaidInvoiceViewer] Recovered from stall');
        },
      });
      
      return () => {
        unsubscribe();
        stallMonitor.stop();
      };
    }
  }, [open, loadingPhase, isNavigating, invoiceId, toast]);

  // Update runtime context on mount/unmount
  useEffect(() => {
    runtimeDebugContext.update({
      route: window.location.pathname,
      viewerOpen: open,
      invoiceCount: invoiceIds.length,
    });

    return () => {
      runtimeDebugContext.update({ viewerOpen: false, invoiceId: undefined });
    };
  }, [open, invoiceIds.length]);

  // Update runtime context on invoice/index change
  useEffect(() => {
    runtimeDebugContext.update({
      invoiceId,
      currentIndex,
      invoiceCount: invoiceIds.length,
    });
  }, [invoiceId, currentIndex, invoiceIds.length]);

  // Update runtime context on phase change
  useEffect(() => {
    runtimeDebugContext.update({ loadingPhase });
  }, [loadingPhase]);

  // Update runtime context on navigation state change
  useEffect(() => {
    runtimeDebugContext.update({ isNavigating, isInCooldown });
  }, [isNavigating, isInCooldown]);

  // Ensure cleanup when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      requestIdRef.current += 1; // invalidate pending
      setInvoice(null);
      setLoading(false);
      setIsNavigating(false);
      setLoadingPhase('idle');
      setIsInCooldown(false);
      warningCountRef.current = 0;
      runtimeDebugContext.update({ viewerOpen: false, invoiceId: undefined, loadingPhase: 'idle' });
    }
    onOpenChange(nextOpen);
  };

  // Fetch invoice with sequential loading phases
  useEffect(() => {
    if (!open || !invoiceId) {
      setInvoice(null);
      setLoadingPhase('idle');
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingPhase('fetching-data');
    runtimeDebugContext.update({ requestId: currentRequestId });

    const t0 = performance.now();
    let t1 = 0, t2 = 0, t3 = 0;

    fetchInvoiceById(invoiceId)
      .then(({ data, error }) => {
        // Only update if this is still the latest request
        if (currentRequestId !== requestIdRef.current) {
          telemetry.logUIEvent("invoice_viewer_stale_response", { invoiceId });
          return;
        }

        if (error) {
          console.error("Error fetching invoice:", error);
          telemetry.logError("invoice_viewer_fetch_error", error);
          
          // Log structured error
          ApiErrorLogger.logSupabaseError('select', error, {
            table: 'invoices',
            invoiceId,
            invoiceNumber: data?.invoice_no,
            userContext: 'PaidInvoiceViewer/fetchInvoiceById',
          }).catch(console.error);

          toast({
            title: "Failed to load invoice",
            description: error.message,
            variant: "destructive",
          });
          setInvoice(null);
          setLoadingPhase('idle');
        } else if (data) {
          t1 = performance.now();
          setInvoice(data);
          setLoadingPhase('data-ready');
          
          // Wait 100ms buffer before mounting PDF
          setTimeout(() => {
            if (currentRequestId === requestIdRef.current) {
              t2 = performance.now();
              setLoadingPhase('mounting-pdf');
              
              // Give PDF time to mount
              setTimeout(() => {
                if (currentRequestId === requestIdRef.current) {
                  t3 = performance.now();
                  setLoadingPhase('complete');
                  
                  // Log phase timings
                  const phaseTiming = {
                    fetchData: t1 - t0,
                    bufferDelay: t2 - t1,
                    pdfMount: t3 - t2,
                    total: t3 - t0,
                  };
                  telemetry.logPerf("invoice_viewer_phase_timing", {
                    ...phaseTiming,
                    invoiceId,
                  });
                  runtimeDebugContext.update({ phaseTiming });
                }
              }, 150);
            }
          }, 100);
        } else {
          setInvoice(null);
          setLoadingPhase('idle');
        }
      })
      .catch((error) => {
        if (currentRequestId === requestIdRef.current) {
          console.error("Error fetching invoice:", error);
          telemetry.logError("invoice_viewer_fetch_exception", error);
          
          // Log structured error
          ApiErrorLogger.logError({
            endpoint: 'viewer/fetch',
            method: 'GET',
            error,
            requestData: {
              invoiceId,
              requestId: currentRequestId,
              loadingPhase,
              currentIndex,
              invoiceCount: invoiceIds.length,
            },
            userContext: 'PaidInvoiceViewer/fetchException',
          }).catch(console.error);

          setInvoice(null);
          setLoadingPhase('idle');
        }
      })
      .finally(() => {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setIsNavigating(false);
        }
      });
  }, [invoiceId, open, toast]);

  // Navigation handler with hard cleanup
  const handleNavigate = useCallback(
    async (targetInvoiceId: string, direction: "prev" | "next") => {
      // Block during cooldown
      if (isInCooldown) {
        telemetry.logUIEvent("navigation_blocked_cooldown", { targetInvoiceId });
        return;
      }

      // Prevent concurrent navigation
      if (isNavigating) {
        telemetry.logUIEvent("navigation_blocked_concurrent", { targetInvoiceId });
        return;
      }

      // Debounce rapid navigation (200ms)
      const now = Date.now();
      if (now - lastNavigationRef.current < 200) {
        telemetry.logUIEvent("navigation_debounced", { targetInvoiceId });
        return;
      }
      lastNavigationRef.current = now;

      // Circuit breaker: limit to 3 navigations per second
      const windowStart = now - 1000;
      navBurstRef.current = navBurstRef.current.filter((t) => t > windowStart);
      
      if (navBurstRef.current.length >= 3) {
        warningCountRef.current += 1;
        
        if (warningCountRef.current === 1) {
          toast({
            title: "Slow down",
            description: "You're navigating too quickly.",
          });
          telemetry.logUIEvent("navigation_circuit_breaker_warning", { 
            targetInvoiceId, 
            burstSize: navBurstRef.current.length 
          });
        } else {
          // Enter cooldown on second violation
          setIsInCooldown(true);
          toast({
            title: "Navigation paused",
            description: "Please wait 2 seconds before continuing.",
            variant: "destructive",
          });
          telemetry.logUIEvent("navigation_circuit_breaker_cooldown", { 
            targetInvoiceId, 
            burstSize: navBurstRef.current.length 
          });
          
          setTimeout(() => {
            setIsInCooldown(false);
            navBurstRef.current = [];
            warningCountRef.current = 0;
          }, 2000);
          
          return;
        }
      }
      navBurstRef.current.push(now);

      // Validate invoiceIds array
      if (!invoiceIdsRef.current || invoiceIdsRef.current.length === 0) {
        console.error("Navigation failed: invoiceIds array is empty");
        return;
      }

      // Validate target invoice exists
      if (!invoiceIdsRef.current.includes(targetInvoiceId)) {
        console.error("Navigation failed: target invoice not in list", targetInvoiceId);
        toast({
          title: "Navigation Error",
          description: "Invoice not found in current list",
          variant: "destructive",
        });
        return;
      }

      setIsNavigating(true);
      
      runtimeDebugContext.update({ 
        lastNavDirection: direction, 
        lastNavAt: now,
        isNavigating: true,
      });

      // NO CLEANUP - Testing basic navigation
      telemetry.logUIEvent("invoice_navigation", { direction, targetInvoiceId });
      onNavigate?.(targetInvoiceId);
      
      // Reset navigation flag after a short delay
      setTimeout(() => setIsNavigating(false), 300);
    },
    [isNavigating, onNavigate, toast, isInCooldown]
  );

  // Prefetch adjacent invoices
  useEffect(() => {
    if (!open || currentIndex < 0) return;
    
    // Prefetch previous invoice
    if (currentIndex > 0) {
      prefetchInvoiceById(invoiceIdsRef.current[currentIndex - 1]);
    }
    
    // Prefetch next invoice
    if (currentIndex < invoiceIdsRef.current.length - 1) {
      prefetchInvoiceById(invoiceIdsRef.current[currentIndex + 1]);
    }
  }, [currentIndex, open]);

  // Keyboard navigation DISABLED for testing (to isolate crash cause)
  // If crashes stop with buttons-only navigation, arrow keys are the culprit

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open && (
        <ErrorBoundary>
          <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0 data-[state=open]:animate-slide-in-right">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {loadingPhase === 'fetching-data' ? (
                    <>
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </>
                  ) : invoice ? (
                    <>
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-foreground">
                          {invoice.invoice_no}
                        </h2>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{invoice.supplier_name}</span>
                        <span className="text-border">|</span>
                        <span>Paid: {formatDate(invoice.paid_date)}</span>
                        <span className="text-border">|</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <h2 className="text-xl font-bold text-foreground">Invoice</h2>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {loadingPhase !== 'idle' && loadingPhase !== 'complete' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {loadingPhase === 'fetching-data' && 'Loading data...'}
                      {loadingPhase === 'data-ready' && 'Preparing...'}
                      {loadingPhase === 'mounting-pdf' && 'Loading PDF...'}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenChange(false)}
                    className="flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {loadingPhase === 'fetching-data' ? (
                <div className="flex-1 flex gap-6 p-6">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[600px] w-full" />
                  </div>
                  <div className="w-[420px] space-y-3">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              ) : invoice ? (
                <>
                  {/* Left: PDF Preview */}
                  <div className="flex-1 bg-muted/30 overflow-auto p-6">
                    {invoice.drive_embed_url ? (
                      <PDFViewer ref={pdfRef} invoice={invoice} key={invoice.id} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No preview available
                      </div>
                    )}
                  </div>

                  {/* Right: Metadata */}
                  <div className="w-[420px] bg-muted/50 overflow-auto p-6 border-l border-border">
                    <XeroSection
                      invoice={invoice}
                      onUpdate={() => {}}
                      onSync={() => {}}
                      key={invoice.id}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  No invoice selected
                </div>
              )}
            </div>

            {/* Footer with Navigation Hints */}
            {invoice && invoiceIds.length > 0 && (
              <div className="sticky bottom-0 px-6 py-3 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => canGoPrev && handleNavigate(invoiceIdsRef.current[currentIndex - 1], "prev")}
                    disabled={!canGoPrev || isNavigating || isInCooldown}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => canGoNext && handleNavigate(invoiceIdsRef.current[currentIndex + 1], "next")}
                    disabled={!canGoNext || isNavigating || isInCooldown}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Invoice {currentIndex + 1} of {invoiceIdsRef.current.length}
                </div>
              </div>
            )}
          </DialogContent>
        </ErrorBoundary>
      )}
    </Dialog>
  );
}
