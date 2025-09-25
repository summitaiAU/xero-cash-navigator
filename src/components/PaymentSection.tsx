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

interface PaymentSectionProps {
  invoice: Invoice;
  onMarkAsPaid: (data: PaymentData) => Promise<void>;
  onSkip: () => void;
  onFlag?: (invoiceId: string) => void;
  loading?: boolean;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  invoice,
  onMarkAsPaid,
  onSkip,
  onFlag,
  loading = false
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
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
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

    const paymentData: PaymentData = {
      email,
      message,
      payment_method: paymentMethod as any,
      image_base64: imageData || undefined
    };

    await onMarkAsPaid(paymentData);
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

      const response = await fetch('https://sodhipg.app.n8n.cloud/webhook/5be72df6-ae48-4250-9e16-57b4f15a1ff6', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        try {
          const responseData = await response.json();
          const isSuccess = Array.isArray(responseData) 
            ? responseData.some(item => item.remittance_sent === true)
            : responseData.remittance_sent === true;

          if (isSuccess) {
            const successItem = Array.isArray(responseData) 
              ? responseData.find(item => item.remittance_sent === true)
              : responseData;
            
            setRemittanceResponse(`✅ Remittance sent successfully`);
            toast({
              title: "Remittance sent!",
              description: "Successfully uploaded and forwarded remittance",
            });
          } else {
            throw new Error('Remittance not sent successfully');
          }
        } catch (error) {
          console.error('Failed to parse response or remittance not sent:', error);
          setRemittanceResponse(`❌ Error: Failed to upload and forward remittance`);
          toast({
            title: "Failed to send remittance",
            description: "Failed to upload and forward remittance",
            variant: "destructive",
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        setRemittanceResponse(`❌ Error: Upload failed`);
        toast({
          title: "Failed to send remittance",
          description: "Failed to upload and forward remittance",
          variant: "destructive",
        });
      }
    } catch (error) {
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

  const handleEmailSaved = () => {
    // Reload the page to refresh invoice data with new saved emails
    window.location.reload();
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
      
      // Refresh the page to update the view
      window.location.reload();
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
      
      // Refresh the page to update the view
      window.location.reload();
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
    <div className="dashboard-card p-6">
      <h3 className="section-header">Payment Confirmation</h3>

      {/* Payment Proof Upload */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Payment Proof</Label>
        
        <div 
          className={`upload-area ${dragOver ? 'dragover' : ''} ${imageData ? 'border-success' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !imageData && document.getElementById('file-input')?.click()}
        >
          {!imageData ? (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-center">
                <h4 className="text-lg font-medium mb-2">Drop your remittance screenshot here</h4>
                <p className="text-muted-foreground mb-4">or click to browse files</p>
                <div className="flex items-center justify-center gap-2 text-sm text-primary">
                  <Camera className="h-4 w-4" />
                  <span>💡 Press Ctrl+V to paste from clipboard</span>
                </div>
              </div>
              <input
                id="file-input"
                type="file"
                accept="image/*"
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


        {/* Email Configuration */}
        <div className="space-y-4 pt-4 border-t border-border">
          <SavedEmailManager
            invoice={invoice}
            onEmailSaved={handleEmailSaved}
            onEmailSelected={handleEmailSelected}
            selectedEmail={selectedEmailForRemittance}
          />

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

        {/* Invoice Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Invoice:</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Supplier:</span>
            <span className="font-medium">{invoice.supplier}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
            <span>Amount:</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {/* Show payment status */}
        {invoice.status === 'PAID' && (
          <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-success">Fully Paid</span>
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
              >
                Unmark as Paid
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This invoice has been fully paid. You can unmark it if needed.
            </p>
          </div>
        )}

        {invoice.status === 'PARTIALLY PAID' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">Partially Paid</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnmarkPartialPayment}
                className="text-orange-700 hover:text-orange-800"
              >
                <Undo className="h-4 w-4 mr-1" />
                Unmark Partial
              </Button>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">{formatCurrency(Number(invoice.amount_paid) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due:</span>
                <span className="font-medium">{formatCurrency(Number(invoice.amount_due) || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Only show payment buttons if status is not PAID */}
        {invoice.status !== 'PAID' && (
          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="default"
              size="lg"
              onClick={handleMarkAsPaidWithRemittance}
              disabled={loading || !email}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Mark as Fully Paid & Send Remittance'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={handleMarkAsPaidOnly}
              disabled={loading}
              className="w-full"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Fully Paid
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPartialPaymentModal(true)}
              disabled={loading}
              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Partially Paid
            </Button>
            
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip to Next Invoice
            </Button>

            {/* Flag Invoice Button */}
            {onFlag && (
              <FlagInvoiceButton
                invoice={invoice}
                onFlag={onFlag}
              />
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