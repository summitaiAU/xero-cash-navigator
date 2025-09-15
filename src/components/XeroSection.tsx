import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Check,
  Loader2,
  Edit,
  Save,
  X,
  Plus,
  Trash2
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
  
  // Extract and parse bank account details
  const bankAccountDetails = invoice?.Contact?.BankAccountDetails || invoice?.Contact?.BatchPayments?.BankAccountNumber || '';
  const { bsb, accountNumber } = parseBankAccountDetails(bankAccountDetails);
  
  return {
    // Header fields
    invoiceNumber: invoice?.InvoiceNumber || 'No number',
    contactName: invoice?.Contact?.Name || 'Unknown Contact',
    issueDate: formatDate(invoice?.DateString),
    dueDate: formatDate(invoice?.DueDateString),
    reference: invoice?.Reference || '',
    currency: invoice?.CurrencyCode || 'AUD',
    status: invoice?.Status || 'UNKNOWN',
    
    // Payment details
    bsb,
    accountNumber,
    
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

const parseBankAccountDetails = (bankDetails?: string) => {
  if (!bankDetails) return { bsb: 'N/A', accountNumber: 'N/A' };
  
  // Parse format like "062 596 1030 2535" or "062-268 1051 7708"
  const cleaned = bankDetails.replace(/[-]/g, ' ').trim();
  const parts = cleaned.split(/\s+/);
  
  if (parts.length >= 4) {
    // Format: "062 268 1051 7708" -> BSB: "062-268", Account: "1051 7708"
    const bsb = `${parts[0]}-${parts[1]}`;
    const accountNumber = parts.slice(2).join(' ');
    return { bsb, accountNumber };
  }
  
  return { bsb: 'N/A', accountNumber: bankDetails };
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
  
  // Edit mode state management
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [webhookData, setWebhookData] = useState<XeroWebhookInvoice[]>([]);
  
  const { toast } = useToast();

  // Edit mode functions
  const startEditing = () => {
    console.log('Edit button clicked', { webhookData, xeroData });
    
    // Use xeroData if webhookData is not available
    if (!webhookData[0] && !xeroData) {
      console.error('No data available for editing');
      return;
    }
    
    // Construct editable data from available source
    const sourceData = webhookData[0] || {
      InvoiceNumber: xeroData?.invoiceNumber || '',
      DateString: xeroData?.issueDate ? `${xeroData.issueDate.split('/').reverse().join('-')}T00:00:00` : '',
      DueDateString: xeroData?.dueDate ? `${xeroData.dueDate.split('/').reverse().join('-')}T00:00:00` : '',
      Reference: xeroData?.reference || '',
      CurrencyCode: xeroData?.currency || 'AUD',
      LineItems: xeroData?.lineItems?.map((item, index) => ({
        Description: item.description || '',
        Quantity: item.quantity || 0,
        UnitAmount: item.unitAmount || 0,
        AccountCode: item.account?.split(' -')[0] || '429',
        TaxType: item.taxRate === 'GST (10%)' ? 'INPUT' : 'NONE'
      })) || []
    };
    
    setEditableData({
      invoiceNumber: sourceData.InvoiceNumber || '',
      issueDate: sourceData.DateString ? sourceData.DateString.split('T')[0] : '',
      dueDate: sourceData.DueDateString ? sourceData.DueDateString.split('T')[0] : '',
      reference: sourceData.Reference || '',
      currency: sourceData.CurrencyCode || 'AUD',
      lineItems: (sourceData.LineItems || []).map((item: any, index: number) => ({
        id: `item_${Date.now()}_${index}`,
        description: item.Description || '',
        quantity: item.Quantity || 0,
        unitAmount: item.UnitAmount || 0,
        accountCode: item.AccountCode || '429',
        taxType: item.TaxType || 'INPUT'
      }))
    });
    setIsEditing(true);
    setSaveError(null);
    console.log('Edit mode enabled');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditableData(null);
    setSaveError(null);
  };

  // Real-time calculation functions
  const calculateLineItemSubtotal = (quantity: number, unitAmount: number) => {
    return (quantity || 0) * (unitAmount || 0);
  };

  const calculateTaxAmount = (subtotal: number, taxType: string) => {
    return taxType === 'INPUT' ? subtotal * 0.1 : 0;
  };

  const calculateInvoiceTotals = (lineItems: any[]) => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + calculateLineItemSubtotal(item.quantity, item.unitAmount);
    }, 0);
    
    const totalTax = lineItems.reduce((sum, item) => {
      const itemSubtotal = calculateLineItemSubtotal(item.quantity, item.unitAmount);
      return sum + calculateTaxAmount(itemSubtotal, item.taxType);
    }, 0);
    
    return { subtotal, totalTax, total: subtotal + totalTax };
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    if (!editableData) return;
    const updatedLineItems = [...editableData.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: field === 'quantity' || field === 'unitAmount' ? parseFloat(value) || 0 : value
    };
    setEditableData({ ...editableData, lineItems: updatedLineItems });
  };

  const addLineItem = () => {
    if (!editableData) return;
    setEditableData({
      ...editableData,
      lineItems: [...editableData.lineItems, {
        id: Date.now() + Math.random(),
        description: '', 
        quantity: 0, 
        unitAmount: 0,
        accountCode: '429', 
        taxType: 'INPUT'
      }]
    });
  };

  const removeLineItem = (index: number) => {
    if (!editableData) return;
    setEditableData({
      ...editableData,
      lineItems: editableData.lineItems.filter((_: any, i: number) => i !== index)
    });
  };

  // Save function with webhook integration
  const saveInvoice = async () => {
    if (!editableData) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Prefer webhook raw data; fallback to displayed xeroData
      const base = webhookData[0] || {
        Type: 'ACCPAY',
        Status: 'DRAFT',
        CurrencyCode: editableData.currency || xeroData?.currency || 'AUD',
        Contact: { Name: xeroData?.contactName || 'Unknown Contact' },
      } as any;

      const payload = {
        invoice_details: {
          Invoices: [{
            Type: base.Type || 'ACCPAY',
            Status: base.Status || 'DRAFT',
            CurrencyCode: editableData.currency,
            Contact: { Name: base.Contact?.Name || 'Unknown Contact' },
            InvoiceNumber: editableData.invoiceNumber,
            Date: editableData.issueDate,
            DueDate: editableData.dueDate,
            Reference: editableData.reference,
            LineAmountTypes: 'Exclusive',
            LineItems: editableData.lineItems.map((item: any) => ({
              Description: item.description,
              Quantity: item.quantity,
              UnitAmount: item.unitAmount,
              AccountCode: item.accountCode,
              TaxType: item.taxType
            }))
          }]
        }
      };
      
      console.log('Saving invoice payload:', payload);

      const response = await fetch('https://sodhipg.app.n8n.cloud/webhook/346bb7cc-233c-4dce-a721-e09e258fd1c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log('Save invoice result:', result);
      
      if (!response.ok) {
        throw new Error(result[0]?.error?.message || `HTTP ${response.status}: Save failed`);
      }
      
      const payloadResult = Array.isArray(result) ? result[0] : result;
      if (payloadResult?.Status === 'OK' && payloadResult?.Invoices?.[0]) {
        const updatedInvoice = payloadResult.Invoices[0];
        // Update webhook data and process it
        setWebhookData([updatedInvoice]);
        setXeroData(processWebhookData([updatedInvoice]));
        setIsEditing(false);
        setEditableData(null);
        toast({ title: 'Invoice Saved', description: 'Invoice changes saved successfully.' });
      } else {
        throw new Error('Invalid response from update service');
      }
    } catch (error: any) {
      setSaveError(error.message);
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

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
      
      // Store raw webhook data for editing (normalize to array)
      const normalized = Array.isArray(webhookResponse) ? webhookResponse : [webhookResponse];
      setWebhookData(normalized);
      
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
      
      // Handle OK/non-OK HTTP statuses
      const raw = result;
      const payload = Array.isArray(raw) ? raw[0] : raw;

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Approval failed');
      }

      // Accept either array-wrapped or plain object responses
      if (payload?.Status === 'OK' && payload?.Invoices?.[0]) {
        const updatedInvoice = payload.Invoices[0];
        // Update local state with processed data (function handles object or array)
        setXeroData(processWebhookData(updatedInvoice));
        console.log('Approval successful, status:', updatedInvoice.Status);
        toast({ title: 'Invoice Approved', description: 'Invoice is now authorised.' });
      } else {
        console.warn('Unexpected approval payload:', payload);
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
              {isEditing ? (
                <Input
                  type="date"
                  value={editableData?.issueDate || ''}
                  onChange={(e) => setEditableData({...editableData, issueDate: e.target.value})}
                />
              ) : (
                <div className="text-sm md:text-base">{xeroData.issueDate}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editableData?.dueDate || ''}
                  onChange={(e) => setEditableData({...editableData, dueDate: e.target.value})}
                />
              ) : (
                <div className="text-sm md:text-base">{xeroData.dueDate}</div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableData?.invoiceNumber || ''}
                  onChange={(e) => setEditableData({...editableData, invoiceNumber: e.target.value})}
                />
              ) : (
                <div className="font-medium text-sm md:text-base break-words">{xeroData.invoiceNumber}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableData?.reference || ''}
                  onChange={(e) => setEditableData({...editableData, reference: e.target.value})}
                />
              ) : (
                <div className={`py-2 px-3 rounded text-sm break-words ${!xeroData.reference ? 'bg-yellow-100 text-yellow-800' : 'bg-muted'}`}>
                  {xeroData.reference || 'No reference'}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
              {isEditing ? (
                <select
                  value={editableData?.currency || 'AUD'}
                  onChange={(e) => setEditableData({...editableData, currency: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CNY">CNY</option>
                </select>
              ) : (
                <div className="text-sm md:text-base">{xeroData.currency}</div>
              )}
            </div>
          </div>

          {/* Line Items - Mobile Responsive */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Items</Label>
            
            {/* Desktop Table View */}
            {isEditing ? (
              <div className="hidden lg:block border border-border rounded-lg overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-12">Item</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase min-w-[280px]">Description</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[80px]">Qty</th>
                      <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground uppercase min-w-[120px]">Unit Price</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[100px]">Account</th>
                      <th className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase min-w-[120px]">Tax</th>
                      <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground uppercase min-w-[120px]">Amount</th>
                      <th className="px-2 py-3 w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {editableData?.lineItems?.map((item: any, index: number) => {
                      const subtotal = calculateLineItemSubtotal(item.quantity, item.unitAmount);
                      return (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="px-2 py-4 text-sm text-center font-medium">{index + 1}</td>
                          <td className="px-2 py-4">
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              className="text-sm min-h-[60px] resize-none w-full"
                              placeholder="Item description"
                            />
                          </td>
                          <td className="px-2 py-4">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                              className="text-sm text-center"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-4">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitAmount || ''}
                              onChange={(e) => updateLineItem(index, 'unitAmount', e.target.value)}
                              className="text-sm text-right"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-4">
                            <Input
                              type="text"
                              value={item.accountCode}
                              onChange={(e) => updateLineItem(index, 'accountCode', e.target.value)}
                              className="text-sm text-center"
                            />
                          </td>
                          <td className="px-2 py-4 relative">
                            <select
                              value={item.taxType}
                              onChange={(e) => updateLineItem(index, 'taxType', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
                            >
                              <option value="INPUT">INPUT</option>
                              <option value="NONE">NONE</option>
                            </select>
                          </td>
                          <td className="px-2 py-4 text-sm font-medium text-right">{formatCurrency(subtotal)}</td>
                          <td className="px-2 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8} className="px-2 py-3 bg-muted/20">
                        <Button
                          variant="outline"
                          onClick={addLineItem}
                          className="text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Line Item
                        </Button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
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
            )}

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {isEditing ? (
                editableData?.lineItems?.map((item: any, index: number) => {
                  const subtotal = calculateLineItemSubtotal(item.quantity, item.unitAmount);
                  return (
                    <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">Item #{index + 1}</div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-right">{formatCurrency(subtotal)}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            className="mt-1"
                            placeholder="Item description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitAmount}
                              onChange={(e) => updateLineItem(index, 'unitAmount', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Account</Label>
                            <Input
                              type="text"
                              value={item.accountCode}
                              onChange={(e) => updateLineItem(index, 'accountCode', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Tax Rate</Label>
                            <select
                              value={item.taxType}
                              onChange={(e) => updateLineItem(index, 'taxType', e.target.value)}
                              className="mt-1 relative z-10 flex h-10 w-full min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="INPUT">INPUT</option>
                              <option value="NONE">NONE</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                xeroData.lineItems.map((item, index) => (
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
                ))
              )}
              
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={addLineItem}
                  className="w-full text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              )}
            </div>
          </div>

          {/* Totals - Responsive */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 bg-muted/30 rounded-lg p-4">
              {(() => {
                const totals = isEditing && editableData 
                  ? calculateInvoiceTotals(editableData.lineItems)
                  : { 
                      subtotal: xeroData?.subtotal || 0, 
                      totalTax: xeroData?.totalTax || 0, 
                      total: xeroData?.total || 0 
                    };
                
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className={`font-medium ${isEditing ? 'text-blue-600 font-semibold' : ''}`}>
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total tax:</span>
                      <span className={`font-medium ${isEditing ? 'text-blue-600 font-semibold' : ''}`}>
                        {formatCurrency(totals.totalTax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base md:text-lg font-bold border-t border-border pt-2">
                      <span>Total:</span>
                      <div className="flex items-center gap-2">
                        <span className={isEditing ? 'text-blue-600' : ''}>{formatCurrency(totals.total)}</span>
                        {!isEditing && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Payment Details Section - Only show if bank details are available */}
          {xeroData.bsb !== 'N/A' && xeroData.accountNumber !== 'N/A' && (
            <div className="space-y-4 pt-4 border-t border-border">
              <Label className="text-base font-medium">Payment Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-muted/20 rounded-lg p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">BSB</Label>
                  <div className="font-mono text-sm md:text-base font-medium">{xeroData.bsb}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Account Number</Label>
                  <div className="font-mono text-sm md:text-base font-medium">{xeroData.accountNumber}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={startEditing}
                    disabled={!hasXeroData}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
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
                </>
              ) : (
                <>
                  <Button 
                    onClick={saveInvoice}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={cancelEditing}
                    disabled={isSaving}
                    variant="outline"
                    className="disabled:bg-gray-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Error Messages */}
            {approvalError && !isEditing && (
              <div className="w-full sm:flex-1 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                <p className="text-sm">Error: {approvalError}</p>
              </div>
            )}
            
            {saveError && isEditing && (
              <div className="w-full sm:flex-1 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                <p className="text-sm">Save Error: {saveError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};