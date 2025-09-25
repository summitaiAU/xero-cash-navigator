import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { SavedEmailManager } from '@/components/SavedEmailManager';
import { useToast } from '@/hooks/use-toast';
import { Invoice } from '@/types/invoice';
import { flagInvoice } from '@/services/invoiceService';

interface FlagInvoiceModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const FLAG_TYPES = {
  'wrong-entity': 'Wrong Entity',
  'incorrect-details': 'Incorrect Details',
  'other': 'Other'
};

const EMAIL_TEMPLATES = {
  'wrong-entity': {
    subject: 'Invoice Entity Correction Required - {{invoice_number}}',
    body: `Dear {{supplier_name}},

We have received your invoice {{invoice_number}} but noticed that it may have been sent to the incorrect entity.

Could you please verify the correct entity details and resend the invoice if necessary?

Attached is a copy of the current invoice for your reference.

Best regards,
Accounts Payable Team`
  },
  'incorrect-details': {
    subject: 'Invoice Details Clarification Required - {{invoice_number}}',
    body: `Dear {{supplier_name}},

We have received your invoice {{invoice_number}} but require clarification on some details before we can process payment.

Please review the attached invoice and provide the necessary corrections or additional information.

Best regards,
Accounts Payable Team`
  }
};

export const FlagInvoiceModal: React.FC<FlagInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onComplete
}) => {
  const [flagType, setFlagType] = useState<string>('');
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const availableEmails = [
    { label: 'Sender Email', value: invoice.sender_email || '' },
    { label: 'Supplier Email (from invoice)', value: invoice.supplier_email_on_invoice || '' },
    { label: 'Add New Email', value: 'custom' }
  ].filter(email => email.value);

  const handleFlagTypeChange = (type: string) => {
    setFlagType(type);
    
    if (type === 'wrong-entity' || type === 'incorrect-details') {
      const template = EMAIL_TEMPLATES[type as keyof typeof EMAIL_TEMPLATES];
      setSubject(template.subject
        .replace('{{invoice_number}}', invoice.invoice_number)
      );
      setEmailBody(template.body
        .replace('{{supplier_name}}', invoice.supplier)
        .replace('{{invoice_number}}', invoice.invoice_number)
      );
      
      // Set default email to supplier email
      if (invoice.supplier_email_on_invoice) {
        setEmailAddress(invoice.supplier_email_on_invoice);
      }
    } else if (type === 'other') {
      // For "other" type, set basic template
      setSubject(`Invoice Query - ${invoice.invoice_number}`);
      setEmailBody(`Dear ${invoice.supplier},\n\nWe have a query regarding your invoice ${invoice.invoice_number}.\n\nPlease contact us to discuss.\n\nBest regards,\nAccounts Payable Team`);
      
      // Set default email to supplier email
      if (invoice.supplier_email_on_invoice) {
        setEmailAddress(invoice.supplier_email_on_invoice);
      }
    } else {
      setSubject('');
      setEmailBody('');
    }
  };

  const handleEmailAddressChange = (value: string) => {
    setEmailAddress(value);
    if (value !== 'custom') {
      setCustomEmail('');
    }
  };

  const getSelectedEmail = () => {
    return emailAddress === 'custom' ? customEmail : emailAddress;
  };

  const handleSubmit = async () => {
    if (!flagType) {
      toast({
        title: "Error",
        description: "Please select a flag type",
        variant: "destructive"
      });
      return;
    }

    const selectedEmail = getSelectedEmail();
    
    if (flagType && !selectedEmail) {
      toast({
        title: "Error", 
        description: "Please select or enter an email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      await flagInvoice(invoice.id, {
        flagType,
        emailAddress: selectedEmail,
        subject,
        emailBody
      });

      toast({
        title: "Invoice Flagged",
        description: "Invoice has been flagged and notification sent",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to flag invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Flag Invoice - {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flag Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Flag Reason</Label>
            <RadioGroup value={flagType} onValueChange={handleFlagTypeChange}>
              {Object.entries(FLAG_TYPES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Email Section - Show for all flag types */}
          {flagType && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <Label className="text-sm font-medium">Email Notification</Label>
                
                {/* Email Address Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Send to:</Label>
                  <Select value={emailAddress} onValueChange={handleEmailAddressChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email address..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmails.map((email, index) => (
                        <SelectItem key={index} value={email.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{email.label}</span>
                            {email.value !== 'custom' && (
                              <span className="text-xs text-muted-foreground">{email.value}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Email Input */}
                {emailAddress === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Custom email address:</Label>
                    <Input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="Enter email address..."
                    />
                  </div>
                )}

                {/* Email Subject */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Subject:</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Message:</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Email message..."
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? 'Flagging...' : 'Flag Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};