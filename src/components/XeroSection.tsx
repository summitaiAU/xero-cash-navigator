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
  Trash2,
  ThumbsUp,
  Undo
} from 'lucide-react';
import { Invoice, XeroWebhookInvoice, ProcessedXeroData } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface XeroSectionProps {
  invoice: Invoice;
  onUpdate: (updates: any) => void;
  onSync: () => void;
  loading?: boolean;
}

// Process Supabase data for display
const processSupabaseData = (invoice: Invoice): ProcessedXeroData => {
  // Parse list_items if it's a string
  let parsedItems: any[] = [];
  if (invoice.xero_data?.lineItems) {
    parsedItems = invoice.xero_data.lineItems;
  } else if (typeof invoice.list_items === 'string') {
    try {
      parsedItems = JSON.parse(invoice.list_items);
    } catch (error) {
      parsedItems = [];
    }
  } else if (Array.isArray(invoice.list_items)) {
    parsedItems = invoice.list_items;
  }

  return {
    // Header fields
    invoiceNumber: invoice.invoice_no || invoice.invoice_number || 'No number',
    contactName: invoice.supplier_name || invoice.supplier || 'Unknown Supplier',
    issueDate: formatDate(invoice.invoice_date),
    dueDate: formatDate(invoice.due_date),
    reference: invoice.project || '',
    currency: invoice.currency || 'AUD',
    status: 'READY',
    
    // Payment details - not available from Supabase
    bsb: 'N/A',
    accountNumber: 'N/A',
    
    // Line items
    lineItems: parsedItems.map((item: any, index: number) => ({
      itemNumber: index + 1,
      description: item?.description || '',
      quantity: item?.quantity || 1,
      unitAmount: item?.unit_price || item?.unitAmount || 0,
      account: `${item?.account_code || '429'} - Expenses`,
      taxRate: 'GST (10%)',
      amount: item?.total || item?.amount || 0
    })),
    
    // Financial totals
    subtotal: Number(invoice.subtotal) || 0,
    totalTax: Number(invoice.gst) || 0,
    total: Number(invoice.total_amount) || 0
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
  const [invoiceData, setInvoiceData] = useState<ProcessedXeroData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Edit mode state management
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  
  const { toast } = useToast();

  // Edit mode functions
  const startEditing = () => {
    if (!invoiceData) {
      console.error('No data available for editing');
      return;
    }
    
    setEditableData({
      entity: invoice.entity || '',
      project: invoice.project || '',
      supplierName: invoice.supplier_name || invoice.supplier || '',
      invoiceNumber: invoice.invoice_no || invoice.invoice_number || '',
      invoiceDate: invoice.invoice_date || '',
      dueDate: invoice.due_date || '',
      currency: invoice.currency || 'AUD',
      lineItems: invoiceData.lineItems.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        description: item.description || '',
        quantity: item.quantity || 1,
        unitAmount: item.unitAmount || 0,
        accountCode: item.account?.split(' -')[0] || '429',
        taxType: 'INPUT'
      }))
    });
    setIsEditing(true);
    setSaveError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditableData(null);
    setSaveError(null);
  };

  // Approval functions
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const { approveInvoice } = await import('@/services/invoiceService');
      await approveInvoice(invoice.id);
      
      const updatedInvoice = { ...invoice, approved: true };
      onUpdate(updatedInvoice);
      toast({ title: 'Invoice Approved', description: 'Invoice has been approved successfully.' });
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleUndoApproval = async () => {
    setIsApproving(true);
    try {
      const { undoApproveInvoice } = await import('@/services/invoiceService');
      await undoApproveInvoice(invoice.id);
      
      const updatedInvoice = { ...invoice, approved: false };
      onUpdate(updatedInvoice);
      toast({ title: 'Approval Undone', description: 'Invoice approval has been reverted to Ready status.' });
    } catch (error: any) {
      toast({
        title: 'Undo Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
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

  // Save function with Supabase update
  const saveInvoice = async () => {
    if (!editableData) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Calculate totals from line items
      const totals = calculateInvoiceTotals(editableData.lineItems);
      
      // Format line items for Supabase
      const formattedLineItems = editableData.lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitAmount,
        account_code: item.accountCode,
        total: item.quantity * item.unitAmount
      }));

      // Import and call the update function
      const { updateInvoiceData } = await import('@/services/invoiceService');
      
      await updateInvoiceData(invoice.id, {
        entity: editableData.entity,
        project: editableData.project,
        supplier_name: editableData.supplierName,
        invoice_no: editableData.invoiceNumber,
        invoice_date: editableData.invoiceDate,
        due_date: editableData.dueDate,
        currency: editableData.currency,
        list_items: formattedLineItems,
        subtotal: totals.subtotal,
        gst: totals.totalTax,
        total_amount: totals.total
      });

      // Update local state
      const updatedInvoice = {
        ...invoice,
        entity: editableData.entity,
        project: editableData.project,
        supplier_name: editableData.supplierName,
        invoice_no: editableData.invoiceNumber,
        invoice_date: editableData.invoiceDate,
        due_date: editableData.dueDate,
        currency: editableData.currency,
        list_items: formattedLineItems,
        subtotal: totals.subtotal,
        gst: totals.totalTax,
        total_amount: totals.total
      };

      setInvoiceData(processSupabaseData(updatedInvoice));
      setIsEditing(false);
      setEditableData(null);
      onUpdate(updatedInvoice);
      toast({ title: 'Invoice Saved', description: 'Invoice changes saved successfully.' });
      
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

  // Load data from Supabase
  const loadInvoiceData = () => {
    try {
      setDataLoading(true);
      const processed = processSupabaseData(invoice);
      setInvoiceData(processed);
    } catch (error: any) {
      console.error('Failed to process invoice data', error);
      toast({ 
        title: 'Failed to load invoice data', 
        description: error.message || 'Unknown error', 
        variant: 'destructive' 
      });
    } finally {
      setDataLoading(false);
    }
  };


  useEffect(() => {
    loadInvoiceData();
  }, [invoice?.id]);

  const isLoading = dataLoading || loading;
  const hasInvoiceData = !!invoiceData;

  return (
    <div className="dashboard-card p-4 md:p-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h3 className="section-header mb-0 truncate">Invoice Details</h3>
          <Badge variant={invoice.approved ? 'default' : 'secondary'}>
            {invoice.approved ? 'Approved' : (invoice.status || 'Ready')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={loadInvoiceData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
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
      ) : !hasInvoiceData ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No invoice data available</p>
          <Button onClick={loadInvoiceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Information - Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Entity</Label>
              {isEditing ? (
                <select
                  value={editableData?.entity || ''}
                  onChange={(e) => setEditableData({...editableData, entity: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-10"
                >
                  <option value="Sodhi Property Developers Pty Ltd">Sodhi Property Developers Pty Ltd</option>
                  <option value="NALA Properties Pty Ltd">NALA Properties Pty Ltd</option>
                  {invoice.entity && 
                   invoice.entity !== 'Sodhi Property Developers Pty Ltd' && 
                   invoice.entity !== 'NALA Properties Pty Ltd' && (
                    <option value={invoice.entity}>{invoice.entity}</option>
                  )}
                </select>
              ) : (
                <div className="font-medium text-sm md:text-base break-words">{invoice.entity || 'Not specified'}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Project</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableData?.project || ''}
                  onChange={(e) => setEditableData({...editableData, project: e.target.value})}
                />
              ) : (
                <div className={`py-2 px-3 rounded text-sm break-words ${!invoice.project ? 'bg-yellow-100 text-yellow-800' : 'bg-muted'}`}>
                  {invoice.project || 'No project'}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableData?.supplierName || ''}
                  onChange={(e) => setEditableData({...editableData, supplierName: e.target.value})}
                />
              ) : (
                <div className="font-medium text-sm md:text-base break-words">{invoiceData.contactName}</div>
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
                <div className="font-medium text-sm md:text-base break-words">{invoiceData.invoiceNumber}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editableData?.invoiceDate || ''}
                  onChange={(e) => setEditableData({...editableData, invoiceDate: e.target.value})}
                />
              ) : (
                <div className="text-sm md:text-base">{invoiceData.issueDate}</div>
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
                <div className="text-sm md:text-base">{invoiceData.dueDate}</div>
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
                  <div className="col-span-1 p-4 text-center">Item</div>
                  <div className="col-span-3 p-4 border-l border-border">Description</div>
                  <div className="col-span-1 p-4 border-l border-border text-center">Qty.</div>
                  <div className="col-span-2 p-4 border-l border-border text-center">Unit Price</div>
                  <div className="col-span-2 p-4 border-l border-border text-center">Account</div>
                  <div className="col-span-1 p-4 border-l border-border text-center">Tax</div>
                  <div className="col-span-2 p-4 border-l border-border text-center">Amount</div>
                </div>

                {invoiceData.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-0 border-b border-border last:border-b-0 hover:bg-muted/20">
                    <div className="col-span-1 p-4 flex items-center justify-center">
                      <div className="text-sm">{item.itemNumber}</div>
                    </div>
                    
                   <div className="col-span-3 p-4 border-l border-border">
                      <div className="text-sm break-words pr-2 leading-relaxed">{item.description || 'No description'}</div>
                    </div>
                    
                    <div className="col-span-1 p-4 border-l border-border text-center">
                      <div className="text-sm">{item.quantity}</div>
                    </div>
                    
                    <div className="col-span-2 p-4 border-l border-border text-center">
                      <div className="text-sm break-words">{formatCurrency(item.unitAmount)}</div>
                    </div>
                    
                    <div className="col-span-2 p-4 border-l border-border">
                      <div className="text-xs break-words leading-relaxed">{item.account}</div>
                    </div>
                    
                    <div className="col-span-1 p-4 border-l border-border text-center">
                      <div className="text-xs break-words">{item.taxRate}</div>
                    </div>
                    
                    <div className="col-span-2 p-4 border-l border-border text-right">
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
                invoiceData.lineItems.map((item, index) => (
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
                      subtotal: invoiceData?.subtotal || 0, 
                      totalTax: invoiceData?.totalTax || 0, 
                      total: invoiceData?.total || 0 
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


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={startEditing}
                    disabled={!hasInvoiceData}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  {invoice.approved ? (
                    <Button 
                      onClick={handleUndoApproval}
                      disabled={isApproving}
                      variant="outline"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Undoing...
                        </>
                      ) : (
                        <>
                          <Undo className="h-4 w-4 mr-2" />
                          Undo Approval
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleApprove}
                      disabled={isApproving}
                      variant="success"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
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