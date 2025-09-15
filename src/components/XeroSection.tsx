import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { Invoice, XeroWebhookInvoice, ProcessedXeroData } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface XeroSectionProps {
  invoice: Invoice;
  onUpdate: (updates: any) => void;
  onSync: () => void;
  loading?: boolean;
}

// Exact mapping functions as specified
const processWebhookData = (webhookArray: XeroWebhookInvoice[]): ProcessedXeroData => {
  // Webhook is always an array, get first invoice
  const invoice = webhookArray[0];
  
  return {
    // Header fields
    invoiceNumber: invoice?.InvoiceNumber || 'No number',
    contactName: invoice?.Contact?.Name || 'Unknown Contact',
    issueDate: formatDate(invoice?.DateString),
    dueDate: formatDate(invoice?.DueDateString),
    reference: invoice?.Reference || '',
    currency: invoice?.CurrencyCode || 'AUD',
    status: invoice?.Status || 'UNKNOWN',
    
    // Line items with exact field mapping
    lineItems: (invoice?.LineItems || []).map((item, index) => ({
      itemNumber: index + 1,
      description: item?.Description || '',
      quantity: item?.Quantity || 0,
      unitAmount: item?.UnitAmount || 0,
      account: `${item?.AccountCode || ''} - Expenses`,
      taxRate: convertTaxType(item?.TaxType),
      amount: item?.LineAmount || 0
    })),
    
    // Financial totals
    subtotal: invoice?.SubTotal || 0,
    totalTax: invoice?.TotalTax || 0,
    total: invoice?.Total || 0
  };
};

const convertTaxType = (taxType?: string) => {
  return taxType === 'INPUT' ? 'GST (10%)' : taxType || 'No Tax';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const XeroSection: React.FC<XeroSectionProps> = ({ 
  invoice, 
  onUpdate, 
  onSync,
  loading = false 
}) => {
  const [xeroData, setXeroData] = useState<ProcessedXeroData | null>(null);
  const [xeroLoading, setXeroLoading] = useState(true);
  const { toast } = useToast();

  // Fetch Xero invoice from webhook
  const fetchXeroData = async () => {
    const webhookUrl = 'https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e';
    const xeroId = invoice.xero_bill_id;
    
    if (!xeroId) {
      setXeroLoading(false);
      toast({ 
        title: 'Missing Xero ID', 
        description: 'No Xero invoice ID found for this record.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setXeroLoading(true);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ xero_invoice_id: xeroId }),
      });
      
      const webhookResponse = await response.json();
      
      // Check for error in response
      if (webhookResponse[0]?.error) {
        throw new Error(webhookResponse[0].error);
      }

      // Process the webhook data
      const processed = processWebhookData(webhookResponse);
      setXeroData(processed);
      
    } catch (error: any) {
      console.error('Fetch Xero invoice failed', error);
      toast({ 
        title: 'Failed to load Xero invoice', 
        description: error.message || 'Unknown error', 
        variant: 'destructive' 
      });
    } finally {
      setXeroLoading(false);
    }
  };

  useEffect(() => {
    fetchXeroData();
  }, [invoice?.id]);

  const isLoading = xeroLoading || loading;
  const hasXeroData = !!xeroData;

  return (
    <div className="dashboard-card p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="section-header mb-0">Xero Invoice</h3>
          {hasXeroData && (
            <>
              {xeroData.status === 'DRAFT' && <Badge variant="secondary">Draft</Badge>}
              {xeroData.status === 'AWAITING_PAYMENT' && <Badge variant="default">Awaiting Payment</Badge>}
              {xeroData.status === 'AUTHORISED' && <Badge variant="default">Authorised</Badge>}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchXeroData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync'}
          </Button>
          {invoice.xero_bill_id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.open(`https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${invoice.xero_bill_id}`, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Xero
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ) : !hasXeroData ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No Xero data available</p>
          <Button onClick={fetchXeroData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Xero Data
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Information */}
          <div className="grid grid-cols-3 gap-6 py-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">To</Label>
              <div className="font-medium">{xeroData.contactName}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
              <div>{xeroData.issueDate}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <div>{xeroData.dueDate}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 py-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
              <div className="font-medium">{xeroData.invoiceNumber}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
              <div className={`py-1 px-2 rounded text-sm ${!xeroData.reference ? 'bg-yellow-100 text-yellow-800' : ''}`}>
                {xeroData.reference || 'No reference'}
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
              <div>{xeroData.currency}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Items</Label>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
                <div className="col-span-1 p-2 text-center">Item</div>
                <div className="col-span-4 p-2 border-l border-border">Description</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Qty.</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Unit Price</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Account</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Tax Rate</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Amount</div>
              </div>

              {xeroData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-0 border-b border-border last:border-b-0 hover:bg-muted/20">
                  <div className="col-span-1 p-2 flex items-center justify-center">
                    <div className="text-sm">{item.itemNumber}</div>
                  </div>
                  
                  <div className="col-span-4 p-2 border-l border-border">
                    <div className="text-sm">{item.description || 'No description'}</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.quantity}</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    <div className="text-sm">{formatCurrency(item.unitAmount)}</div>
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.account}</div>
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.taxRate}</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border flex items-center justify-center">
                    <div className="text-sm font-medium">{formatCurrency(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(xeroData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total tax:</span>
                <span>{formatCurrency(xeroData.totalTax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(xeroData.total)}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};