import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RoutePerfMonitor } from "@/components/RoutePerfMonitor";
import { ApiErrorLogger } from "@/services/apiErrorLogger";
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

// Create QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient();

function App() {
  // Global error handlers
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[Global] Uncaught error:', event.error);
      ApiErrorLogger.logError({
        endpoint: 'window/error',
        method: 'WINDOW_ERROR',
        error: event.error,
      }).catch(err => console.error('[Global] Failed to log error:', err));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Global] Unhandled promise rejection:', event.reason);
      ApiErrorLogger.logError({
        endpoint: 'window/unhandledrejection',
        method: 'PROMISE_REJECTION',
        error: event.reason,
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