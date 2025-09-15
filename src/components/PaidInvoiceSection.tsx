import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, DollarSign, Building } from 'lucide-react';
import { Invoice } from '@/types/invoice';

interface PaidInvoiceSectionProps {
  invoice: Invoice;
  onReprocess?: () => void;
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
  onReprocess
}) => {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Payment Completed
          </CardTitle>
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            PAID
          </Badge>
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
              </p>
            </div>
          </div>
        </div>

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