import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag, CheckCircle, Mail } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { resolveFlag } from '@/services/invoiceService';
import { useToast } from '@/hooks/use-toast';

interface MobileFlaggedSectionProps {
  invoice: Invoice;
  onResolve: () => void;
}

export const MobileFlaggedSection: React.FC<MobileFlaggedSectionProps> = ({
  invoice,
  onResolve
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResolve = async () => {
    setLoading(true);
    try {
      await resolveFlag(invoice.id);
      toast({
        title: "Flag Resolved",
        description: "Invoice has been returned to payable status",
      });
      onResolve();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve flag",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFlagTypeLabel = (flagType?: string) => {
    switch (flagType) {
      case 'wrong-entity': return 'Wrong Entity';
      case 'incorrect-details': return 'Incorrect Details';
      case 'other': return 'Other';
      default: return 'Flagged';
    }
  };

  return (
    <div className="mx-2 mt-3 p-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Flag className="h-5 w-5 text-amber-600" />
        <h3 className="text-base font-semibold text-amber-800">Flagged Invoice</h3>
      </div>
      
      <p className="text-xs text-amber-700 mb-4">
        This invoice has been flagged and requires attention before it can be processed.
      </p>

      {/* Invoice Details Grid */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-start py-2 border-b border-amber-200/50">
          <span className="text-xs text-muted-foreground">Invoice Number:</span>
          <span className="text-sm font-mono font-medium">{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between items-start py-2 border-b border-amber-200/50">
          <span className="text-xs text-muted-foreground">Supplier:</span>
          <span className="text-sm font-medium text-right">{invoice.supplier}</span>
        </div>
        <div className="flex justify-between items-start py-2 border-b border-amber-200/50">
          <span className="text-xs text-muted-foreground">Amount:</span>
          <span className="text-sm font-semibold tabular-nums">${invoice.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-start py-2 border-b border-amber-200/50">
          <span className="text-xs text-muted-foreground">Flag Reason:</span>
          <span className="text-sm font-medium">{getFlagTypeLabel((invoice as any).flag_type)}</span>
        </div>
      </div>

      {/* Email Notification Section */}
      {(invoice as any).flag_email_address && (
        <div className="border-t border-amber-200 pt-4 mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <Mail className="h-4 w-4" />
            Email Notification Sent
          </div>
          
          <div className="bg-white/60 rounded-lg p-3 space-y-2.5">
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">To:</span>
              <p className="text-sm mt-0.5">{(invoice as any).flag_email_address}</p>
            </div>
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Subject:</span>
              <p className="text-sm mt-0.5">{(invoice as any).flag_email_subject}</p>
            </div>
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Message:</span>
              <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                {(invoice as any).flag_email_body}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Button */}
      <div className="mt-4 pt-4 border-t border-amber-200">
        <Button 
          onClick={handleResolve}
          disabled={loading}
          className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading ? 'Resolving...' : 'Resolve Flag'}
        </Button>
      </div>
    </div>
  );
};
