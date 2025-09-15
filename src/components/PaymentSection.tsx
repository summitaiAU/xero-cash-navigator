import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Camera, X, Send, Check, AlertTriangle, Plus, Save } from 'lucide-react';
import { Invoice, PaymentData } from '@/types/invoice';
import { paymentMethodOptions } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

interface PaymentSectionProps {
  invoice: Invoice;
  onMarkAsPaid: (data: PaymentData) => Promise<void>;
  onSkip: () => void;
  loading?: boolean;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  invoice,
  onMarkAsPaid,
  onSkip,
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
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const { toast } = useToast();

  // Update email when invoice changes
  useEffect(() => {
    setEmail(invoice.remittance_email || '');
    setShowAddEmail(false);
    setNewSupplierEmail('');
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

      const result = await response.json();
      
      if (response.ok && result[0]?.ok) {
        setRemittanceResponse(`✅ Remittance sent successfully to ${result[0].emailed_to}. File uploaded to Drive: ${result[0].file_name}`);
        toast({
          title: "Remittance sent!",
          description: `Successfully sent to ${result[0].emailed_to}`,
        });
      } else {
        const errorMsg = result[0]?.error || 'Unknown error occurred';
        setRemittanceResponse(`❌ Error: ${errorMsg}`);
        toast({
          title: "Failed to send remittance",
          description: errorMsg,
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

  const saveSupplierEmail = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newSupplierEmail || !emailRegex.test(newSupplierEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Ensure required fields are present
    if (!invoice.xero_bill_id) {
      toast({
        title: "Missing invoice data",
        description: "Xero invoice ID is required to update supplier email.",
        variant: "destructive",
      });
      return;
    }

    setSavingEmail(true);
    try {
      const response = await fetch('https://sodhipg.app.n8n.cloud/webhook/d497731a-7362-4f0d-a199-bc6f217c5916', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xero_invoice_id: invoice.xero_bill_id,
          new_supplier_email: newSupplierEmail,
          row_id: invoice.id
        })
      });

      // Parse response robustly (can be array or object)
      const rawText = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }
      const payload = Array.isArray(parsed) ? parsed[0] : parsed;
      const isSuccess = !!payload && (payload?.ok === true || payload?.Status === 'OK' || payload?.status === 'OK' || (!!payload?.Contacts && !payload?.error));

      if (response.ok && isSuccess) {
        // Update the email in state
        setEmail(newSupplierEmail);
        setShowAddEmail(false);
        setNewSupplierEmail('');

        toast({
          title: "Email updated!",
          description: `Supplier email updated to ${newSupplierEmail}`,
        });
      } else {
        const errorMsg = (
          (Array.isArray(parsed) && parsed[0]?.error?.message) ||
          payload?.error?.message ||
          (Array.isArray(parsed) && parsed[0]?.error) ||
          'Failed to update supplier email'
        );
        toast({
          title: "Failed to update email",
          description: String(errorMsg),
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      toast({
        title: "Failed to update email",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSavingEmail(false);
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

        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="payment-method">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email Configuration */}
        <div className="space-y-4 pt-4 border-t border-border">
          <Label className="text-base font-medium">Email Remittance</Label>
          
          <div className="space-y-2">
            <Label htmlFor="email">Supplier Email</Label>
            {!showAddEmail ? (
              <Select
                value={(email ?? '') as any}
                onValueChange={(value) => {
                  if (value === 'add_email') {
                    setShowAddEmail(true);
                    // Focus input when it appears
                    setTimeout(() => {
                      const el = document.getElementById('new-supplier-email') as HTMLInputElement | null;
                      el?.focus();
                    }, 0);
                  } else {
                    setEmail(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add Email" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {email && <SelectItem value={email}>{email}</SelectItem>}
                  <SelectItem value="add_email">Add Email</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="new-supplier-email"
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    placeholder="Enter supplier email..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveSupplierEmail}
                    disabled={savingEmail || !newSupplierEmail}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {savingEmail ? 'Saving...' : 'Save email'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddEmail(false);
                      setNewSupplierEmail('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {invoice.remittance_email && !showAddEmail && (
              <p className="text-sm text-muted-foreground">📧 Default email from database: {invoice.remittance_email}</p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a custom message to the remittance email..."
              maxLength={500}
              rows={3}
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/500 characters
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
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="default"
            size="lg"
            onClick={handleMarkAsPaidWithRemittance}
            disabled={loading || !email}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Processing...' : 'Mark as Paid & Send Remittance'}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={handleMarkAsPaidOnly}
            disabled={loading}
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark as Paid Only
          </Button>
          
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip to Next Invoice
          </Button>
        </div>
      </div>
    </div>
  );
};