import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Calendar, DollarSign, Building, Send, Upload, X, Check } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface PaidInvoiceSectionProps {
  invoice: Invoice;
  onReprocess?: () => void;
  onRemittanceSent?: (invoiceId: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const PaidInvoiceSection: React.FC<PaidInvoiceSectionProps> = ({
  invoice,
  onReprocess,
  onRemittanceSent
}) => {
  const [showRemittanceSection, setShowRemittanceSection] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [email, setEmail] = useState(invoice.remittance_email || invoice.supplier_email || '');
  const [ccJonathon, setCcJonathon] = useState(false);
  const [sendingRemittance, setSendingRemittance] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

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
            toast({
              title: "Remittance sent!",
              description: "Successfully uploaded and forwarded remittance",
            });
            
            // Update invoice remittance status
            if (onRemittanceSent) {
              onRemittanceSent(invoice.id);
            }
            
            setShowRemittanceSection(false);
            setImageData(null);
          } else {
            throw new Error('Remittance not sent successfully');
          }
        } catch (error) {
          console.error('Failed to parse response or remittance not sent:', error);
          toast({
            title: "Failed to send remittance",
            description: "Failed to upload and forward remittance",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Failed to send remittance",
          description: "Failed to upload and forward remittance",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      toast({
        title: "Failed to send remittance",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSendingRemittance(false);
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Payment Completed
          </CardTitle>
          <div className="flex items-center gap-2">
            {invoice.remittance_sent && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                REMITTANCE SENT
              </Badge>
            )}
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              PAID
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                <p className="font-semibold">{invoice.supplier}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="font-semibold text-lg">{formatCurrency(invoice.amount)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <p className="font-semibold">{formatDate(invoice.due_date)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="font-semibold text-success">Payment Processed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Confirmation */}
        <div className="bg-success/5 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-success">Payment Confirmed</h3>
              <p className="text-sm text-muted-foreground">
                This invoice has been marked as paid and processed successfully.
                {!invoice.remittance_sent && " No remittance was sent."}
              </p>
            </div>
          </div>
        </div>

        {/* Remittance Section */}
        {!invoice.remittance_sent && !showRemittanceSection && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemittanceSection(true)}
              className="text-primary hover:text-primary"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Remittance Now
            </Button>
          </div>
        )}

        {showRemittanceSection && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Send Remittance</h4>
            
            {/* Upload Area */}
            <div 
              className={`upload-area ${dragOver ? 'dragover' : ''} ${imageData ? 'border-success' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !imageData && document.getElementById('remittance-file-input')?.click()}
            >
              {!imageData ? (
                <div className="space-y-4">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Drop payment proof here or click to browse</p>
                  </div>
                  <input
                    id="remittance-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <img 
                      src={imageData} 
                      alt="Payment proof" 
                      className="max-h-32 w-auto mx-auto rounded-lg"
                    />
                    <Button
                      variant="ghost-destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageData(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-success">
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Payment proof uploaded</span>
                  </div>
                </div>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="remittance-email">Supplier Email</Label>
              <Input
                id="remittance-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter supplier email..."
              />
            </div>

            {/* CC Jonathon */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cc-jonathon-paid"
                checked={ccJonathon}
                onCheckedChange={(checked) => setCcJonathon(checked as boolean)}
              />
              <Label htmlFor="cc-jonathon-paid" className="text-sm">
                CC Jonathon
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                onClick={sendRemittanceNow}
                disabled={sendingRemittance || !email || !imageData}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingRemittance ? 'Sending...' : 'Send Remittance'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRemittanceSection(false);
                  setImageData(null);
                }}
                disabled={sendingRemittance}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {onReprocess && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onReprocess}
              className="text-muted-foreground hover:text-foreground"
            >
              Reprocess Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};