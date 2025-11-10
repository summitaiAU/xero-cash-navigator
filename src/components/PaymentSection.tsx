import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Camera, X, Send, Check, AlertTriangle, Plus, Save, CheckCircle, DollarSign, Undo } from 'lucide-react';
import { Invoice, PaymentData } from '@/types/invoice';
import { paymentMethodOptions } from '@/data/mockData';
import { FlagInvoiceButton } from './FlagInvoiceButton';
import { PartialPaymentModal } from './PartialPaymentModal';
import { SavedEmailManager } from './SavedEmailManager';
import { useToast } from '@/hooks/use-toast';
import { ApiErrorLogger } from '@/services/apiErrorLogger';

interface PaymentSectionProps {
  invoice: Invoice;
  onMarkAsPaid: (data: PaymentData) => Promise<void>;
  onSkip: () => void;
  onFlag?: (invoiceId: string) => void;
  loading?: boolean;
  onPartialPaymentUpdate?: () => Promise<void>;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  invoice,
  onMarkAsPaid,
  onSkip,
  onFlag,
  loading = false,
  onPartialPaymentUpdate
}) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState(invoice.remittance_email || '');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [dragOver, setDragOver] = useState(false);
  const [ccJonathon, setCcJonathon] = useState(false);
  const [sendingRemittance, setSendingRemittance] = useState(false);
  const [remittanceResponse, setRemittanceResponse] = useState<string | null>(null);
  const [selectedEmailForRemittance, setSelectedEmailForRemittance] = useState('');
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false);
  const { toast } = useToast();

  // Update email when invoice changes
  useEffect(() => {
    setEmail(invoice.remittance_email || '');
    setSelectedEmailForRemittance(invoice.remittance_email || '');
  }, [invoice.id]);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(validFile);
    }
  };

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
      console.log('Starting remittance send with mark as paid process', {
        invoiceNumber: invoice.invoice_number,
        email,
        hasImage: !!imageData
      });

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

      console.log('Calling N8N webhook to send remittance', {
        to_email: email,
        invoice_number: invoice.invoice_number,
        xero_invoice_id: invoice.xero_bill_id
      });

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
            userContext: 'Mark as paid with remittance - sending remittance email'
          }
        }
      );

      const responseData = await response.json();
      console.log('N8N webhook response:', responseData);

      const isSuccess = Array.isArray(responseData)
        ? responseData.some(item => item.remittance_sent === true)
        : responseData.remittance_sent === true;

      if (!isSuccess) {
        throw new Error('Remittance was not sent successfully');
      }

      console.log('Remittance sent successfully, now marking as paid');
      setRemittanceResponse(`✅ Remittance sent successfully`);

      // Step 2: Mark as paid (only if remittance succeeded)
      const paymentData: PaymentData = {
        email: selectedEmailForRemittance || email,
        message,
        payment_method: paymentMethod as any,
        image_base64: imageData
      };

      await onMarkAsPaid(paymentData);
      
      console.log('Invoice marked as paid successfully');
      
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
      payment_method: paymentMethod as any,
      image_base64: imageData || undefined
    };

    await onMarkAsPaid(paymentData);
  };

  const sendRemittanceNow = async () => {
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
      console.log('Starting send remittance now process', {
        invoiceNumber: invoice.invoice_number,
        email,
        hasImage: !!imageData
      });

      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('data', blob, `${invoice.invoice_number}-remittance.jpg`);
      formData.append('to_email', email);
      formData.append('file_name', `${invoice.invoice_number}-remittance.jpg`);
      formData.append('xero_invoice_id', invoice.xero_bill_id);
      formData.append('invoice_number', invoice.invoice_number);
      formData.append('send_to_jonathon', ccJonathon.toString());
      formData.append('row_id', invoice.id);

      console.log('Calling N8N webhook to send remittance', {
        to_email: email,
        invoice_number: invoice.invoice_number,
        xero_invoice_id: invoice.xero_bill_id
      });

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
            userContext: 'Send remittance email with payment confirmation'
          }
        }
      );

      const responseData = await response.json();
      console.log('N8N webhook response:', responseData);

      const isSuccess = Array.isArray(responseData)
          ? responseData.some(item => item.remittance_sent === true)
          : responseData.remittance_sent === true;

        if (isSuccess) {
          console.log('Remittance sent successfully');
          setRemittanceResponse(`✅ Remittance sent successfully`);
          toast({
            title: "Remittance sent!",
            description: "Successfully uploaded and forwarded remittance",
          });
        } else {
          throw new Error('Remittance not sent successfully');
        }
    } catch (error) {
      console.error('Error sending remittance:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      setRemittanceResponse(`❌ Error: ${errorMsg}`);
      toast({
        title: "Failed to send remittance",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSendingRemittance(false);
    }
  };

  const handleEmailSaved = (email: string) => {
    // Update the invoice state to include the new saved email
    if (!invoice.saved_emails?.includes(email)) {
      invoice.saved_emails = [...(invoice.saved_emails || []), email];
    }
  };

  const handleEmailRemoved = (email: string) => {
    // Update the invoice state to remove the email
    invoice.saved_emails = (invoice.saved_emails || []).filter(e => e !== email);
  };

  const handleEmailSelected = (email: string) => {
    setSelectedEmailForRemittance(email);
    setEmail(email);
  };

  const handlePartialPayment = async (amountPaid: number) => {
    try {
      const { markAsPartiallyPaid } = await import('@/services/invoiceService');
      await markAsPartiallyPaid(invoice.id, amountPaid);
      
      toast({
        title: "Partial payment recorded",
        description: `Payment of ${formatCurrency(amountPaid)} has been recorded.`,
      });
      
      // Call refresh callback if provided
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
      
      // Call refresh callback if provided
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="dashboard-card space-y-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-4">Payment Confirmation</h3>

      {/* Guided Three-Step Layout */}
      <div className="space-y-8">
        {/* Step 1: Upload Remittance */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-light text-blue font-semibold text-sm">
              1
            </div>
            <Label className="text-base font-semibold">Upload Payment Proof</Label>
          </div>
          
          <div 
            className={`upload-area ${dragOver ? 'dragover' : ''} ${imageData ? 'border-success bg-success/5' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !imageData && document.getElementById('file-input')?.click()}
          >
            {!imageData ? (
              <div className="space-y-5 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'hsl(38 92% 50% / 0.1)' }}>
                  <Upload className="h-8 w-8" style={{ color: 'hsl(38 92% 50%)' }} />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-semibold text-foreground">Drop your remittance file here</h4>
                  <p className="text-sm text-muted-foreground">Images or PDFs accepted • Click to browse files</p>
                  <div className="flex items-center justify-center gap-2 text-xs pt-2" style={{ color: 'hsl(38 92% 50%)' }}>
                    <Camera className="h-4 w-4" />
                    <span>Tip: Press Ctrl+V to paste from clipboard</span>
                  </div>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={imageData} 
                    alt="Payment proof" 
                    className="max-h-64 w-auto mx-auto rounded-lg shadow-medium"
                  />
                  <Button
                    variant="ghost-destructive"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageData(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-success">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Payment proof uploaded</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Choose Recipients */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-light text-blue font-semibold text-sm">
              2
            </div>
            <Label className="text-base font-semibold">Choose Recipients</Label>
          </div>
          
          <div className="space-y-4">
            <SavedEmailManager
              invoice={invoice}
              onEmailSaved={handleEmailSaved}
              onEmailRemoved={handleEmailRemoved}
              onEmailSelected={handleEmailSelected}
              selectedEmail={selectedEmailForRemittance}
            />

            {/* Only show CC Jonathon if there are actual emails (not just default) */}
            {(() => {
              const hasRealEmails = invoice.remittance_email || 
                                   invoice.supplier_email_on_invoice || 
                                   invoice.sender_email || 
                                   (invoice.saved_emails && invoice.saved_emails.length > 0);
              
              return hasRealEmails ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cc-jonathon"
                      checked={ccJonathon}
                      onCheckedChange={(checked) => setCcJonathon(checked as boolean)}
                    />
                    <Label htmlFor="cc-jonathon" className="text-sm">
                      CC Jonathon
                    </Label>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Send Now Button */}
            <Button
              variant="outline"
              onClick={sendRemittanceNow}
              disabled={sendingRemittance || !email || !imageData}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingRemittance ? 'Sending...' : 'Send Remittance Now'}
            </Button>

            {/* Response Message */}
            {remittanceResponse && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>{remittanceResponse}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Confirm & Send */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-light text-blue font-semibold text-sm">
              3
            </div>
            <Label className="text-base font-semibold">Confirm & Send</Label>
          </div>
          
          {/* Invoice Summary Card - Refined */}
          <div className="p-6 bg-muted/30 rounded-2xl space-y-4 border border-border">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-sm font-medium text-muted-foreground">Invoice Details</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice:</span>
                <span className="font-semibold text-foreground">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-semibold text-foreground truncate ml-4">{invoice.supplier}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <span className="text-base font-semibold">Amount:</span>
                <span className="text-xl font-bold" style={{ color: 'hsl(25, 95%, 53%)' }}>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {/* Show payment status */}
        {invoice.status === 'PAID' && (
            <div className="p-5 bg-success/10 border border-success/30 rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-semibold text-success">Fully Paid</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { unmarkInvoiceAsPaid } = await import('@/services/invoiceService');
                    try {
                      await unmarkInvoiceAsPaid(invoice.id);
                      toast({
                        title: "Invoice unmarked",
                        description: "Invoice has been unmarked as paid and moved back to payable.",
                      });
                      window.location.reload();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to unmark invoice as paid",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo
                </Button>
              </div>
              <p className="text-sm text-success/80 mt-2">
                This invoice has been fully paid. You can unmark it if needed.
              </p>
            </div>
        )}

        {invoice.status === 'PARTIALLY PAID' && (
            <div className="p-5 bg-warning/10 border border-warning/30 rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-warning" />
                  <span className="font-semibold text-warning">Partially Paid</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnmarkPartialPayment}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo
                </Button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(Number(invoice.amount_paid) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(Number(invoice.amount_due) || 0)}</span>
                </div>
              </div>
            </div>
        )}

        {/* Only show payment buttons if status is not PAID */}
        {invoice.status !== 'PAID' && (
          <div className="space-y-3 pt-4">
            {/* Primary: Mark as Fully Paid & Send Remittance - Gradient orange */}
            <Button
              size="lg"
              onClick={handleMarkAsPaidWithRemittance}
              disabled={loading || !email}
              className="w-full font-semibold text-white shadow-md hover:shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 95%, 58%))',
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Mark as Fully Paid & Send Remittance'}
            </Button>
            
            {/* Secondary: Mark as Fully Paid - White with border */}
            <Button
              variant="outline"
              size="lg"
              onClick={handleMarkAsPaidOnly}
              disabled={loading}
              className="w-full bg-card hover:bg-muted/50"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Fully Paid
            </Button>

            {/* Tertiary: Mark as Partially Paid - Solid orange */}
            <Button
              size="lg"
              onClick={() => setShowPartialPaymentModal(true)}
              disabled={loading}
              className="w-full text-white"
              style={{ 
                backgroundColor: 'hsl(25, 95%, 53%)',
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Partially Paid
            </Button>
            
            {/* Skip Link - Plain text style */}
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={loading}
              className="w-full text-blue hover:text-blue-hover"
            >
              Skip to Next Invoice
            </Button>

            {/* Flag Invoice Button - Red outline */}
            {onFlag && (
              <div className="pt-2">
                <FlagInvoiceButton
                  invoice={invoice}
                  onFlag={onFlag}
                />
              </div>
            )}
          </div>
        )}

        {/* Partial Payment Modal */}
        <PartialPaymentModal
          isOpen={showPartialPaymentModal}
          onClose={() => setShowPartialPaymentModal(false)}
          onConfirm={handlePartialPayment}
          invoiceAmount={Number(invoice.total_amount) || invoice.amount}
          currentPaid={Number(invoice.amount_paid) || 0}
        />
      </div>
    </div>
  );
};