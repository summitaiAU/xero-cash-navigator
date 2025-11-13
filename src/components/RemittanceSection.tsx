import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Send, Upload, X, Check, Save, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface RemittanceSectionProps {
  invoice: Invoice;
  onRemittanceSent?: (invoiceId: string, email: string) => void;
  compact?: boolean;
}

export const RemittanceSection: React.FC<RemittanceSectionProps> = ({
  invoice,
  onRemittanceSent,
  compact = false
}) => {
  const [showRemittanceSection, setShowRemittanceSection] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [email, setEmail] = useState(invoice.remittance_email || '');
  const [ccJonathon, setCcJonathon] = useState(false);
  const [sendingRemittance, setSendingRemittance] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
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
            
            // Update invoice remittance status with email
            if (onRemittanceSent) {
              onRemittanceSent(invoice.id, email);
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

  return (
    <div className="space-y-4">
      {/* Remittance Status Badge */}
      {invoice.remittance_sent && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            REMITTANCE SENT
          </Badge>
        </div>
      )}

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

      {/* Remittance Image Viewer - Only show if remittance_embed_link exists */}
      {invoice.remittance_embed_link && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-sm font-medium">Remittance Confirmation</Label>
            <div className="border border-border rounded-lg overflow-hidden shadow-sm bg-muted/30">
              <iframe
                src={invoice.remittance_embed_link}
                className="w-full h-[400px]"
                title="Remittance confirmation"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(invoice.remittance_embed_link, '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full View
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Send Remittance Now Button */}
      {!invoice.remittance_sent && !showRemittanceSection && (
        <div className="flex justify-center pt-2">
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

      {/* Send Remittance Section */}
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
            {!showAddEmail ? (
              <Select
                value={(email ?? '') as any}
                onValueChange={(value) => {
                  if (value === 'add_email') {
                    setShowAddEmail(true);
                    // Focus input when it appears
                    setTimeout(() => {
                      const el = document.getElementById('new-supplier-email-remittance') as HTMLInputElement | null;
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
                    id="new-supplier-email-remittance"
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
                    {savingEmail ? 'Saving...' : 'Save'}
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
              <p className="text-sm text-muted-foreground">📧 From database: {invoice.remittance_email}</p>
            )}
          </div>

          {/* CC Jonathon */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cc-jonathon-remittance"
              checked={ccJonathon}
              onCheckedChange={(checked) => setCcJonathon(checked as boolean)}
            />
            <Label htmlFor="cc-jonathon-remittance" className="text-sm">
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
              {sendingRemittance ? 'Sending...' : 'Send Remittance'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemittanceSection(false);
                setImageData(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
