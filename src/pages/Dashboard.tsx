import React, { useState, useEffect } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { XeroSection } from '@/components/XeroSection';
import { PaymentSection } from '@/components/PaymentSection';
import { InvoiceNavigation } from '@/components/InvoiceNavigation';
import { CompletionScreen } from '@/components/CompletionScreen';
import { Invoice, ProcessingStatus, PaymentData } from '@/types/invoice';
import { fetchInvoices, updateInvoicePaymentStatus } from '@/services/invoiceService';
import { invoiceService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedInvoices, setCompletedInvoices] = useState<Set<string>>(new Set());
  const [xeroLoadingStates, setXeroLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    xeroSynced: false,
    paymentUploaded: false,
    remittanceSent: false
  });
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
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

  // Load invoices from Supabase on mount
  useEffect(() => {
    const loadInvoices = async () => {
      console.log('Loading invoices...');
      try {
        setLoading(true);
        const fetchedInvoices = await fetchInvoices();
        console.log('Fetched invoices:', fetchedInvoices.length);
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error('Failed to load invoices:', error);
        toast({
          title: "Error",
          description: "Failed to load invoices. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [toast]);

  const currentInvoice = invoices[currentIndex];

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
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case '?':
          e.preventDefault();
          showKeyboardShortcuts();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
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
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetProcessingStatus();
    }
  };

  const resetProcessingStatus = () => {
    setProcessingStatus({
      xeroSynced: false,
      paymentUploaded: false,
      remittanceSent: false
    });
  };

  const loadXeroData = async (invoiceId: string, xeroInvoiceId: string) => {
    setXeroLoadingStates(prev => new Map(prev.set(invoiceId, true)));
    
    try {
      const xeroData = await invoiceService.getXeroData(xeroInvoiceId);
      
      // Update the invoice in state with fetched Xero data
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, xero_data: { ...inv.xero_data, ...xeroData } }
          : inv
      ));
    } catch (error) {
      console.error(`Failed to fetch Xero data for invoice ${invoiceId}:`, error);
      toast({
        title: "Xero Data Error",
        description: `Failed to load Xero data for this invoice.`,
        variant: "destructive",
      });
    } finally {
      setXeroLoadingStates(prev => new Map(prev.set(invoiceId, false)));
    }
  };

  const handleXeroUpdate = async (updates: any) => {
    if (!currentInvoice) return;

    setLoading(true);
    try {
      // Fetch updated Xero data
      if (currentInvoice.xero_bill_id) {
        await loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id);
        setProcessingStatus(prev => ({ ...prev, xeroSynced: true }));
      }
    } catch (error) {
      console.error('Failed to update Xero:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentData: PaymentData) => {
    if (!currentInvoice) return;

    setLoading(true);
    try {
      // Update invoice status in Supabase
      await updateInvoicePaymentStatus(currentInvoice.id, true);
      
      // Mark as completed
      setCompletedInvoices(prev => new Set([...prev, currentInvoice.id]));
      setProcessingStatus(prev => ({ 
        ...prev, 
        paymentUploaded: true, 
        remittanceSent: !!paymentData.email 
      }));

      toast({
        title: "Payment processed!",
        description: `Invoice ${currentInvoice.invoice_number} marked as paid.`,
      });

      // Auto-advance after 2 seconds
      setTimeout(() => {
        if (currentIndex < invoices.length - 1) {
          handleNext();
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to process payment:', error);
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

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompletedInvoices(new Set());
    resetProcessingStatus();
  };

  const handleExportReport = () => {
    const reportData = invoices.map(invoice => ({
      invoice_number: invoice.invoice_number,
      supplier: invoice.supplier,
      amount: invoice.amount,
      status: completedInvoices.has(invoice.id) ? 'PAID' : 'PENDING',
      processed_at: completedInvoices.has(invoice.id) ? new Date().toISOString() : null
    }));

    const csv = [
      ['Invoice Number', 'Supplier', 'Amount', 'Status', 'Processed At'],
      ...reportData.map(row => [
        row.invoice_number,
        row.supplier,
        row.amount.toString(),
        row.status,
        row.processed_at || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-processing-report-${new Date().toISOString().split('T')[0]}.csv`;
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

  if (!currentInvoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Invoices Found</h1>
          <p className="text-muted-foreground">No invoices available for processing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gradient-primary">Payment Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Navigation */}
        <InvoiceNavigation
          currentIndex={currentIndex}
          totalInvoices={invoices.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onReset={handleRestart}
          completedCount={completedInvoices.size}
        />

        {/* Desktop Layout - Side by Side with much more space for Xero section */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-6">
          <div className="col-span-3 space-y-6">
            <PDFViewer invoice={currentInvoice} />
          </div>
          
          <div className="col-span-4 space-y-6">
            <XeroSection
              invoice={currentInvoice}
              onUpdate={handleXeroUpdate}
              onSync={() => currentInvoice.xero_bill_id && loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id)}
              loading={isXeroLoading}
            />
            
            <PaymentSection
              invoice={currentInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onSkip={handleSkip}
              loading={loading}
            />
          </div>
        </div>

        {/* Mobile Layout - Stacked */}
        <div className="lg:hidden space-y-6">
          <div className="h-96">
            <PDFViewer invoice={currentInvoice} />
          </div>
          
          <XeroSection
            invoice={currentInvoice}
            onUpdate={handleXeroUpdate}
            onSync={() => currentInvoice.xero_bill_id && loadXeroData(currentInvoice.id, currentInvoice.xero_bill_id)}
            loading={isXeroLoading}
          />
          
          <PaymentSection
            invoice={currentInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onSkip={handleSkip}
            loading={loading}
          />
        </div>

        {/* Success Overlay */}
        {isCompleted && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card p-8 rounded-lg shadow-large text-center animate-fade-in">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Invoice Processed!</h3>
              <p className="text-muted-foreground">
                {currentInvoice.invoice_number} has been marked as paid.
              </p>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-card px-3 py-2 rounded-lg shadow-soft border border-border">
          Press ? for keyboard shortcuts
        </div>
      </main>
    </div>
  );
};