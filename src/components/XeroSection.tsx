import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Check,
  Loader2
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
const processWebhookData = (webhookData: XeroWebhookInvoice[] | XeroWebhookInvoice): ProcessedXeroData => {
  // Handle both array and single object responses
  const invoice = Array.isArray(webhookData) ? webhookData[0] : webhookData;
  
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
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
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

  // Approval function
  const handleApprove = async () => {
    // Validation checks
    if (!xeroData) {
      setApprovalError('No invoice data available');
      return;
    }
    
    if (!invoice.xero_bill_id) {
      setApprovalError('Invoice ID not found');
      return;
    }
    
    if (xeroData.status !== 'DRAFT') {
      setApprovalError('Only DRAFT invoices can be approved');
      return;
    }
    
    setIsApproving(true);
    setApprovalError(null);
    
    try {
      const response = await fetch('https://sodhipg.app.n8n.cloud/webhook/1aacb7d6-846c-4c25-b6c7-a01de21157f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xero_invoice_id: invoice.xero_bill_id
        })
      });
      
      const result = await response.json();
      
      // Handle error status
      if (!response.ok) {
        throw new Error(result[0]?.error?.message || 'Approval failed');
      }
      
      // CORRECTED: Check for success response structure
      if (result[0]?.Status === 'OK' && result[0]?.Invoices?.[0]) {
        // Extract the updated invoice from the response
        const updatedInvoice = result[0].Invoices[0];
        
        // Create new webhook data array with updated invoice
        const updatedWebhookData = [updatedInvoice];
        
        // Update the local state with processed data
        setXeroData(processWebhookData(updatedWebhookData));
        
        console.log('Approval successful, status:', updatedInvoice.Status);
        toast({ title: 'Invoice Approved', description: 'Invoice is now authorised.' });
      } else {
        throw new Error('Unexpected response format from approval service');
      }
      
    } catch (error: any) {
      console.error('Approval error:', error);
      setApprovalError(error.message || 'Failed to approve invoice');
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve invoice',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    fetchXeroData();
  }, [invoice?.id]);

  const isLoading = xeroLoading || loading;
  const hasXeroData = !!xeroData;

  return (
    <div className="dashboard-card p-4 md:p-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h3 className="section-header mb-0 truncate">Xero Invoice</h3>
          {hasXeroData && (
            <>
              {xeroData.status === 'DRAFT' && <Badge variant="secondary">Draft</Badge>}
              {xeroData.status === 'AWAITING_PAYMENT' && <Badge variant="default">Awaiting Payment</Badge>}
              {xeroData.status === 'AUTHORISED' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Authorised</Badge>}
              {xeroData.status === 'PAID' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Paid</Badge>}
              {xeroData.status === 'VOIDED' && <Badge variant="destructive">Voided</Badge>}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
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
              <span className="hidden sm:inline">Open in Xero</span>
              <span className="sm:hidden">Xero</span>
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
        <div className="space-y-6">
          {/* Header Information - Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">To</Label>
              <div className="font-medium text-sm md:text-base break-words">{xeroData.contactName}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
              <div className="text-sm md:text-base">{xeroData.issueDate}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <div className="text-sm md:text-base">{xeroData.dueDate}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
              <div className="font-medium text-sm md:text-base break-words">{xeroData.invoiceNumber}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
              <div className={`py-2 px-3 rounded text-sm break-words ${!xeroData.reference ? 'bg-yellow-100 text-yellow-800' : 'bg-muted'}`}>
                {xeroData.reference || 'No reference'}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
              <div className="text-sm md:text-base">{xeroData.currency}</div>
            </div>
          </div>

          {/* Line Items - Mobile Responsive */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Items</Label>
            
            {/* Desktop Table View - Now with full width */}
            <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
                <div className="col-span-1 p-3 text-center">Item</div>
                <div className="col-span-3 p-3 border-l border-border">Description</div>
                <div className="col-span-1 p-3 border-l border-border text-center">Qty.</div>
                <div className="col-span-2 p-3 border-l border-border text-center">Unit Price</div>
                <div className="col-span-2 p-3 border-l border-border text-center">Account</div>
                <div className="col-span-1 p-3 border-l border-border text-center">Tax</div>
                <div className="col-span-2 p-3 border-l border-border text-center">Amount</div>
              </div>

              {xeroData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-0 border-b border-border last:border-b-0 hover:bg-muted/20">
                  <div className="col-span-1 p-3 flex items-center justify-center">
                    <div className="text-sm">{item.itemNumber}</div>
                  </div>
                  
                  <div className="col-span-3 p-3 border-l border-border">
                    <div className="text-sm break-words pr-2">{item.description || 'No description'}</div>
                  </div>
                  
                  <div className="col-span-1 p-3 border-l border-border text-center">
                    <div className="text-sm">{item.quantity}</div>
                  </div>
                  
                  <div className="col-span-2 p-3 border-l border-border text-center">
                    <div className="text-sm break-words">{formatCurrency(item.unitAmount)}</div>
                  </div>
                  
                  <div className="col-span-2 p-3 border-l border-border">
                    <div className="text-xs break-words leading-tight">{item.account}</div>
                  </div>
                  
                  <div className="col-span-1 p-3 border-l border-border text-center">
                    <div className="text-xs break-words">{item.taxRate}</div>
                  </div>
                  
                  <div className="col-span-2 p-3 border-l border-border text-right">
                    <div className="text-sm font-medium break-words">{formatCurrency(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {xeroData.lineItems.map((item, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">Item #{item.itemNumber}</div>
                    <div className="font-bold text-right">{formatCurrency(item.amount)}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <div className="text-sm break-words">{item.description || 'No description'}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <div className="text-sm">{item.quantity}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Unit Price</Label>
                        <div className="text-sm">{formatCurrency(item.unitAmount)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Account</Label>
                        <div className="text-xs break-words">{item.account}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tax Rate</Label>
                        <div className="text-xs">{item.taxRate}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals - Responsive */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 bg-muted/30 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(xeroData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total tax:</span>
                <span className="font-medium">{formatCurrency(xeroData.totalTax)}</span>
              </div>
              <div className="flex justify-between text-base md:text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(xeroData.total)}</span>
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-start items-center gap-4 pt-6 border-t border-border">
            {hasXeroData && xeroData.status === 'DRAFT' && (
              <Button 
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Bill'
                )}
              </Button>
            )}
            
            {hasXeroData && xeroData.status === 'AUTHORISED' && (
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                <Check className="h-4 w-4 mr-2" />
                Approved
              </div>
            )}

            {approvalError && (
              <div className="flex-1 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                <p className="text-sm">Error: {approvalError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};