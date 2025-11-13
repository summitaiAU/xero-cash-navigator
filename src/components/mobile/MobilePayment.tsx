import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, Send, CheckCircle, DollarSign, Undo, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Invoice, PaymentData } from '@/types/invoice';
import { PartialPaymentModal } from '@/components/PartialPaymentModal';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from './utils';
import { ApiErrorLogger } from '@/services/apiErrorLogger';

interface MobilePaymentProps {
  invoice: Invoice;
  onMarkAsPaid: (data: PaymentData) => Promise<void>;
  onPartialPaymentUpdate?: () => Promise<void>;
  isLockedByOther?: boolean;
  loading?: boolean;
}

export const MobilePayment: React.FC<MobilePaymentProps> = ({
  invoice,
  onMarkAsPaid,
  onPartialPaymentUpdate,
  isLockedByOther = false,
  loading = false,
}) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [email, setEmail] = useState(invoice.remittance_email || '');
  const [ccJonathon, setCcJonathon] = useState(false);
  const [sendingRemittance, setSendingRemittance] = useState(false);
  const [remittanceResponse, setRemittanceResponse] = useState<string | null>(null);
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEmail(invoice.remittance_email || '');
  }, [invoice.id]);

  // Paste functionality
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImageData(event.target?.result as string);
              toast({
                title: "Screenshot captured!",
                description: "Payment proof has been added.",
              });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkAsPaidWithRemittance = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter a supplier email address.",
        variant: "destructive",
      });
      return;
    }

    if (!imageData) {
      toast({
        title: "Payment proof required",
        description: "Please upload a payment screenshot before sending remittance.",
        variant: "destructive",
      });
      return;
    }

    setSendingRemittance(true);
    setRemittanceResponse(null);

    try {
      // Step 1: Send the remittance first
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      
      const formData = new FormData();
      formData.append('data', blob, `${invoice.invoice_number}-remittance.jpg`);
      formData.append('to_email', email);
      formData.append('file_name', `${invoice.invoice_number}-remittance.jpg`);
      formData.append('xero_invoice_id', invoice.xero_bill_id);
      formData.append('invoice_number', invoice.invoice_number);
      formData.append('send_to_jonathon', ccJonathon.toString());
      formData.append('row_id', invoice.id);

      const response = await ApiErrorLogger.fetchWithLogging(
        'https://sodhipg.app.n8n.cloud/webhook/5be72df6-ae48-4250-9e16-57b4f15a1ff6',
        {
          method: 'POST',
          body: formData,
          expectJson: true,
          logContext: {
            endpoint: '/webhook/5be72df6-ae48-4250-9e16-57b4f15a1ff6',
            method: 'POST',
            requestData: { 
              to_email: email,
              invoice_number: invoice.invoice_number,
              xero_invoice_id: invoice.xero_bill_id,
              send_to_jonathon: ccJonathon,
              row_id: invoice.id
            },
            invoiceNumber: invoice.invoice_number,
            userContext: 'Mobile: Mark as paid with remittance - sending remittance email'
          }
        }
      );

      const responseData = await response.json();
      const isSuccess = Array.isArray(responseData)
        ? responseData.some(item => item.remittance_sent === true)
        : responseData.remittance_sent === true;

      if (!isSuccess) {
        throw new Error('Remittance was not sent successfully');
      }

      setRemittanceResponse(`✅ Remittance sent successfully`);

      // Step 2: Mark as paid
      const paymentData: PaymentData = {
        email: email,
        message: '',
        payment_method: 'Bank Transfer',
        image_base64: imageData
      };

      await onMarkAsPaid(paymentData);
      
      toast({
        title: "Success!",
        description: "Remittance sent and invoice marked as paid.",
      });

    } catch (error) {
      console.error('Error in mark as paid with remittance:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      setRemittanceResponse(`❌ Error: ${errorMsg}`);
      toast({
        title: "Failed to send remittance",
        description: "The remittance could not be sent. The invoice has NOT been marked as paid.",
        variant: "destructive",
      });
    } finally {
      setSendingRemittance(false);
    }
  };

  const handleMarkAsPaidOnly = async () => {
    const paymentData: PaymentData = {
      email: '',
      message: '',
      payment_method: 'Bank Transfer',
      image_base64: imageData || undefined
    };

    await onMarkAsPaid(paymentData);
  };

  const handlePartialPayment = async (amountPaid: number) => {
    try {
      const { markAsPartiallyPaid } = await import('@/services/invoiceService');
      await markAsPartiallyPaid(invoice.id, amountPaid);
      
      toast({
        title: "Partial payment recorded",
        description: `Payment of ${formatCurrency(amountPaid)} has been recorded.`,
      });
      
      if (onPartialPaymentUpdate) {
        await onPartialPaymentUpdate();
      }
      
      setShowPartialPaymentModal(false);
    } catch (error: any) {
      toast({
        title: "Failed to record partial payment",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUnmarkPartialPayment = async () => {
    try {
      const { unmarkPartialPayment } = await import('@/services/invoiceService');
      await unmarkPartialPayment(invoice.id);
      
      toast({
        title: "Partial payment removed",
        description: "Invoice has been unmarked as partially paid.",
      });
      
      if (onPartialPaymentUpdate) {
        await onPartialPaymentUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Failed to unmark partial payment",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="mx-2 mt-3 mb-2 p-4 bg-card border border-border rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold mb-4">Payment Confirmation</h3>

        {/* Step 1: Upload Payment Proof */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Upload Payment Proof</Label>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-4 ${
              imageData 
                ? 'border-green-400 bg-green-50/50' 
                : 'border-amber-400/40 bg-amber-50/50'
            }`}
            onClick={() => !imageData && document.getElementById('mobile-file-input')?.click()}
          >
            {!imageData ? (
              <div className="text-center space-y-3">
                <Upload className="h-8 w-8 text-amber-500 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tap to upload payment proof</p>
                  <p className="text-xs text-muted-foreground mt-1">Images or PDFs accepted</p>
                </div>
                <input
                  id="mobile-file-input"
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img 
                    src={imageData} 
                    alt="Payment proof" 
                    className="max-h-48 w-auto mx-auto rounded-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageData(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Payment proof uploaded</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Email Input */}
        <div className="mb-4 space-y-2">
          <Label htmlFor="supplier-email" className="text-sm font-medium">
            Supplier Email
          </Label>
          <Input
            id="supplier-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="supplier@example.com"
            className="h-11"
          />
          
          {/* Saved Emails (simplified for mobile) */}
          {invoice.saved_emails && invoice.saved_emails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {invoice.saved_emails.map((savedEmail, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setEmail(savedEmail)}
                  className="text-xs h-8"
                >
                  {savedEmail}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="cc-jonathon"
              checked={ccJonathon}
              onCheckedChange={(checked) => setCcJonathon(checked as boolean)}
            />
            <label htmlFor="cc-jonathon" className="text-xs text-muted-foreground">
              CC Jonathon
            </label>
          </div>
        </div>

        {/* Remittance Response */}
        {remittanceResponse && (
          <div className={`p-3 rounded-lg mb-4 ${
            remittanceResponse.startsWith('✅') 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {remittanceResponse.startsWith('✅') ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <p className="text-sm">{remittanceResponse}</p>
            </div>
          </div>
        )}

        {/* Step 3: Payment Options */}
        <div className="space-y-2">
          {/* Mark as Fully Paid & Send Remittance */}
          <Button
            onClick={handleMarkAsPaidWithRemittance}
            disabled={!imageData || !email || sendingRemittance || isLockedByOther}
            className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            {sendingRemittance ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : isLockedByOther ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Mark as Fully Paid & Send Remittance
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Mark as Fully Paid & Send Remittance
              </>
            )}
          </Button>

          {/* Mark as Fully Paid */}
          <Button
            onClick={handleMarkAsPaidOnly}
            disabled={loading || isLockedByOther}
            variant="outline"
            className="w-full h-11"
          >
            {isLockedByOther ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Mark as Fully Paid
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Fully Paid
              </>
            )}
          </Button>

          {/* Mark as Partially Paid */}
          <Button
            onClick={() => setShowPartialPaymentModal(true)}
            disabled={isLockedByOther}
            className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLockedByOther ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Mark as Partially Paid
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Mark as Partially Paid
              </>
            )}
          </Button>
        </div>

        {/* Partial Payment Status */}
        {invoice.status === 'PARTIALLY PAID' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold">{formatCurrency(invoice.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Due:</span>
                <span className="font-semibold">{formatCurrency(invoice.amount_due || 0)}</span>
              </div>
              <Button
                onClick={handleUnmarkPartialPayment}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <Undo className="mr-2 h-4 w-4" />
                Undo Partial Payment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Partial Payment Modal */}
      <PartialPaymentModal
        isOpen={showPartialPaymentModal}
        onClose={() => setShowPartialPaymentModal(false)}
        onConfirm={handlePartialPayment}
        invoiceAmount={invoice.total_amount || invoice.amount || 0}
        currentPaid={invoice.amount_paid || 0}
      />
    </>
  );
};
