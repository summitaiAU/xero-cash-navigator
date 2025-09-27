import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Invoice } from '@/types/invoice';

interface SavedEmailManagerProps {
  invoice: Invoice;
  onEmailSaved?: (email: string) => void;
  onEmailRemoved?: (email: string) => void;
  onEmailSelected?: (email: string) => void;
  selectedEmail?: string;
  className?: string;
  showAddNew?: boolean;
  showSelection?: boolean;
}

export const SavedEmailManager: React.FC<SavedEmailManagerProps> = ({
  invoice,
  onEmailSaved,
  onEmailRemoved,
  onEmailSelected,
  selectedEmail,
  className = "",
  showAddNew = true,
  showSelection = true
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Get all available emails (database emails + saved emails)
  const getAvailableEmails = () => {
    const emails: { email: string; source: string }[] = [];
    
    // Add database emails
    if (invoice.remittance_email) {
      emails.push({ email: invoice.remittance_email, source: 'Database' });
    }
    if (invoice.supplier_email_on_invoice) {
      emails.push({ email: invoice.supplier_email_on_invoice, source: 'Invoice' });
    }
    if (invoice.sender_email) {
      emails.push({ email: invoice.sender_email, source: 'Sender' });
    }

    // Add saved emails
    if (invoice.saved_emails) {
      invoice.saved_emails.forEach(email => {
        emails.push({ email, source: 'Saved' });
      });
    }

    // If no emails are available, add the default email
    if (emails.length === 0) {
      emails.push({ email: 'jay@jayproconstruction.com.au', source: 'Default' });
    }

    // Remove duplicates
    const uniqueEmails = emails.filter((item, index, self) => 
      index === self.findIndex(e => e.email.toLowerCase() === item.email.toLowerCase())
    );

    return uniqueEmails;
  };

  const availableEmails = getAvailableEmails();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if email already exists
    const existingEmail = availableEmails.find(
      e => e.email.toLowerCase() === newEmail.toLowerCase()
    );
    
    if (existingEmail) {
      toast({
        title: "Email already exists",
        description: `This email is already available from ${existingEmail.source}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const { addSavedEmail } = await import('@/services/invoiceService');
      await addSavedEmail(invoice.id, newEmail);
      
      toast({
        title: "Email saved",
        description: `${newEmail} has been saved to this invoice`,
      });
      
      setNewEmail('');
      setIsAdding(false);
      onEmailSaved?.(newEmail);
      
    } catch (error: any) {
      toast({
        title: "Error saving email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    try {
      const { removeSavedEmail } = await import('@/services/invoiceService');
      await removeSavedEmail(invoice.id, email);
      
      toast({
        title: "Email removed",
        description: `${email} has been removed from saved emails`,
      });
      
      onEmailRemoved?.(email);
      
    } catch (error: any) {
      toast({
        title: "Error removing email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Available emails */}
      {availableEmails.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Available Emails
          </div>
          <div className="space-y-1">
            {availableEmails.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div 
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    showSelection && selectedEmail === item.email 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => showSelection && onEmailSelected?.(item.email)}
                >
                  <span className="text-sm">{item.email}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.source}
                  </Badge>
                </div>
                {item.source === 'Saved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(item.email)}
                    className="ml-2 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new email */}
      {showAddNew && (
        <div className="space-y-2">
          {!isAdding ? (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Email
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEmail();
                  } else if (e.key === 'Escape') {
                    setNewEmail('');
                    setIsAdding(false);
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEmail}
                  disabled={isSaving}
                  size="sm"
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Save className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Save Email
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewEmail('');
                    setIsAdding(false);
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {availableEmails.length === 0 && !isAdding && (
        <div className="text-center text-sm text-muted-foreground py-4">
          No emails available. Add a new email to get started.
        </div>
      )}
    </div>
  );
};