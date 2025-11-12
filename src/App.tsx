import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RoutePerfMonitor } from "@/components/RoutePerfMonitor";
import { ApiErrorLogger } from "@/services/apiErrorLogger";
import { runtimeDebugContext } from "@/services/runtimeDebugContext";
import { queryClient } from "@/services/queryClient";
import "./App.css";

import { AppLayout } from "./layouts/AppLayout";

const Dashboard = lazy(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })));
const Review = lazy(() => import("./pages/Review"));
const PaidInvoices = lazy(() => import("./pages/PaidInvoices"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordVerify = lazy(() => import("./pages/ResetPasswordVerify"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  // Global error handlers with runtime context and rate limiting
  React.useEffect(() => {
    let lastErrorHash = '';
    let lastErrorTime = 0;

    const getErrorHash = (message: string, stack?: string) => {
      return `${message}:${stack?.substring(0, 100) || ''}`;
    };

    const handleError = (event: ErrorEvent) => {
      const memory = (performance as any).memory;
      
      // Console mirror for immediate debugging
      console.error('[CRASH CONTEXT]', {
        message: event.message || String(event.error),
        stack: event.error?.stack,
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        viewerState: runtimeDebugContext.getSnapshot(),
        memory: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        } : null
      });
      
      // Rate limiting: dedupe same error within 3 seconds
      const errorHash = getErrorHash(event.message, event.error?.stack);
      const now = Date.now();
      if (errorHash === lastErrorHash && now - lastErrorTime < 3000) {
        return;
      }
      lastErrorHash = errorHash;
      lastErrorTime = now;

      ApiErrorLogger.logError({
        endpoint: 'window/error',
        method: 'WINDOW_ERROR',
        error: event.error,
        requestData: {
          error_context: {
            route: window.location.pathname,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            userAgent: navigator.userAgent,
            memory: memory ? {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
            } : null,
            viewerState: runtimeDebugContext.getSnapshot(),
          }
        }
      }).catch(err => console.error('[Global] Failed to log error:', err));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const memory = (performance as any).memory;
      
      // Console mirror for immediate debugging
      console.error('[CRASH CONTEXT]', {
        message: String(event.reason),
        stack: event.reason?.stack,
        viewerState: runtimeDebugContext.getSnapshot(),
        memory: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        } : null
      });

      // Rate limiting
      const errorHash = getErrorHash(String(event.reason), event.reason?.stack);
      const now = Date.now();
      if (errorHash === lastErrorHash && now - lastErrorTime < 3000) {
        return;
      }
      lastErrorHash = errorHash;
      lastErrorTime = now;

      ApiErrorLogger.logError({
        endpoint: 'window/unhandledrejection',
        method: 'PROMISE_REJECTION',
        error: event.reason,
        requestData: {
          error_context: {
            route: window.location.pathname,
            userAgent: navigator.userAgent,
            memory: memory ? {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
            } : null,
            viewerState: runtimeDebugContext.getSnapshot(),
          }
        }
      }).catch(err => console.error('[Global] Failed to log rejection:', err));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <TooltipProvider>
            <BrowserRouter>
              <RoutePerfMonitor />
              <ErrorBoundary>
                <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPasswordVerify />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="review" element={<Review />} />
                  <Route path="invoices/paid" element={<PaidInvoices />} />
                </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;