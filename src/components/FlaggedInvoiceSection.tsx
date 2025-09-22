import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, CheckCircle, Mail, Calendar } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { resolveFlag } from '@/services/invoiceService';
import { useToast } from '@/hooks/use-toast';

interface FlaggedInvoiceSectionProps {
  invoice: Invoice;
  onResolve: () => void;
}

export const FlaggedInvoiceSection: React.FC<FlaggedInvoiceSectionProps> = ({
  invoice,
  onResolve
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FLAGGED': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg text-amber-800">Flagged Invoice</CardTitle>
            </div>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
          <CardDescription>
            This invoice has been flagged and requires attention before it can be processed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Invoice Number:</span>
              <p className="font-mono">{invoice.invoice_number}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Supplier:</span>
              <p>{invoice.supplier}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Amount:</span>
              <p className="font-medium">${invoice.amount.toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Flag Reason:</span>
              <p>{getFlagTypeLabel((invoice as any).flag_type)}</p>
            </div>
          </div>

          {(invoice as any).flag_email_address && (
            <div className="border-t border-amber-200 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <Mail className="h-4 w-4" />
                Email Notification Sent
              </div>
              
              <div className="bg-white/60 rounded-lg p-3 space-y-2 text-sm">
                <div>
                  <span className="font-medium">To:</span> {(invoice as any).flag_email_address}
                </div>
                <div>
                  <span className="font-medium">Subject:</span> {(invoice as any).flag_email_subject}
                </div>
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                    {(invoice as any).flag_email_body}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-amber-200">
            <Button 
              onClick={handleResolve}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? 'Resolving...' : 'Resolve Flag'}
            </Button>
            <Button variant="outline" disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};