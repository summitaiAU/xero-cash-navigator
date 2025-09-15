import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  ExternalLink, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { Invoice, XeroLineItem } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface XeroSectionProps {
  invoice: Invoice;
  onUpdate: (updates: any) => void;
  onSync: () => void;
  loading?: boolean;
}

export const XeroSection: React.FC<XeroSectionProps> = ({ 
  invoice, 
  onUpdate, 
  onSync,
  loading = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(invoice.xero_data);
  const [xeroLoading, setXeroLoading] = useState(true);
  const { toast } = useToast();

  // Fetch Xero invoice from webhook and map to local shape
  const fetchXeroData = async () => {
    const webhookUrl = 'https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e';
    const xeroId = (invoice as any).xero_invoice_id || (invoice as any).xero_bill_id || (invoice as any).xero_invoiceId;
    if (!xeroId) {
      setXeroLoading(false);
      toast({ title: 'Missing Xero ID', description: 'No Xero invoice ID found for this record.', variant: 'destructive' });
      return;
    }
    try {
      setXeroLoading(true);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ xero_invoice_id: xeroId }),
      });
      const json = await res.json();
      const payload = Array.isArray(json) ? json[0] : json;
      if (payload?.error) {
        throw new Error(payload.error);
      }
      // Accept both lowercase webhook and native Xero shapes
      const lineItems = (payload.LineItems ?? payload.line_items ?? []).map((li: any) => ({
        Description: li.Description ?? li.description ?? '',
        UnitAmount: li.UnitAmount ?? li.amount ?? 0,
        TaxAmount: li.TaxAmount ?? li.tax_amount ?? 0,
        AccountCode: li.AccountCode ?? li.account_code ?? (payload.account_code ?? ''),
        Quantity: li.Quantity ?? li.quantity ?? 1,
        LineAmount: li.LineAmount ?? (li.amount ?? 0) * (li.quantity ?? 1),
        TaxType: li.TaxType ?? 'INPUT',
        LineItemID: li.LineItemID,
        AccountID: li.AccountID,
      }));

      const mapped = {
        Type: payload.Type,
        InvoiceID: payload.InvoiceID,
        InvoiceNumber: payload.InvoiceNumber ?? payload.invoice_number,
        Reference: payload.Reference ?? payload.reference ?? '',
        Contact: typeof payload.Contact === 'object' && payload.Contact?.Name
          ? { Name: payload.Contact.Name }
          : { Name: payload.contact ?? '' },
        Date: payload.Date ?? payload.date,
        DueDate: payload.DueDate ?? payload.due_date,
        Status: (payload.Status ?? payload.status ?? 'DRAFT') as any,
        LineItems: lineItems,
        SubTotal: payload.SubTotal ?? payload.subtotal ?? 0,
        TotalTax: payload.TotalTax ?? payload.tax ?? 0,
        Total: payload.Total ?? payload.total ?? 0,
        CurrencyCode: payload.CurrencyCode ?? 'AUD',
        AmountDue: payload.AmountDue,
        AmountPaid: payload.AmountPaid,
      } as any;

      setEditedData(mapped);
    } catch (e: any) {
      console.error('Fetch Xero invoice failed', e);
      toast({ title: 'Failed to load Xero invoice', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setXeroLoading(false);
    }
  };

  useEffect(() => {
    fetchXeroData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    // Handle Xero date format /Date(timestamp)/
    if (dateString.startsWith('/Date(')) {
      const timestamp = parseInt(dateString.match(/\d+/)?.[0] || '0');
      return new Date(timestamp).toLocaleDateString('en-AU');
    }
    
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const calculateTotals = (lineItems: XeroLineItem[]) => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.LineAmount || 0), 0);
    const tax = lineItems.reduce((sum, item) => sum + (item.TaxAmount || 0), 0);
    return { SubTotal: subtotal, TotalTax: tax, Total: subtotal + tax };
  };

  const handleLineItemChange = (index: number, field: keyof XeroLineItem, value: any) => {
    const newLineItems = [...editedData.LineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    // Recalculate tax and line amount if unit amount changes
    if (field === 'UnitAmount') {
      const quantity = newLineItems[index].Quantity || 1;
      const lineAmount = value * quantity;
      newLineItems[index].LineAmount = lineAmount;
      newLineItems[index].TaxAmount = (lineAmount * 10) / 100; // 10% GST
    }
    
    const totals = calculateTotals(newLineItems);
    setEditedData({
      ...editedData,
      LineItems: newLineItems,
      ...totals
    });
  };

  const addLineItem = () => {
    const newItem: XeroLineItem = {
      Description: '',
      UnitAmount: 0,
      TaxAmount: 0,
      AccountCode: '429',
      Quantity: 1,
      LineAmount: 0,
      TaxType: 'INPUT'
    };
    
    setEditedData({
      ...editedData,
      LineItems: [...editedData.LineItems, newItem]
    });
  };

  const removeLineItem = (index: number) => {
    const newLineItems = editedData.LineItems.filter((_, i) => i !== index);
    const totals = calculateTotals(newLineItems);
    setEditedData({
      ...editedData,
      LineItems: newLineItems,
      ...totals
    });
  };

  const handleSave = async () => {
    try {
      await onUpdate(editedData);
      setIsEditing(false);
      toast({
        title: "Changes saved",
        description: "Xero invoice has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    fetchXeroData();
    setIsEditing(false);
  };

  const handleApprove = async () => {
    try {
      await onUpdate({ ...editedData, Status: 'AWAITING_PAYMENT' });
      toast({
        title: "Invoice approved",
        description: "Bill status changed to Awaiting Payment in Xero.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLoading = xeroLoading || loading;
  const amountMatches = Math.abs((editedData?.Total || 0) - (editedData?.Total || 0)) < 0.01;
  const hasXeroData = !!editedData && Object.keys(editedData || {}).length > 0;

  return (
    <div className="dashboard-card p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="section-header mb-0">Xero Invoice</h3>
          {hasXeroData && editedData.Status === 'DRAFT' && (
            <Badge variant="secondary">Draft</Badge>
          )}
          {hasXeroData && editedData.Status === 'AWAITING_PAYMENT' && (
            <Badge variant="default">Awaiting Payment</Badge>
          )}
          {hasXeroData && editedData.Status === 'AUTHORISED' && (
            <Badge variant="default">Authorised</Badge>
          )}
        </div>
        
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchXeroData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Sync'}
            </Button>
            {(invoice as any).xero_invoice_id || (invoice as any).xero_bill_id ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const xid = (invoice as any).xero_invoice_id || (invoice as any).xero_bill_id;
                  window.open(`https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${xid}`,'_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Xero
              </Button>
            ) : null}
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
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
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
              <div className="font-medium">{editedData?.Contact?.Name || 'No contact'}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
              <div>{formatDate(editedData?.Date || '')}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <div>{formatDate(editedData?.DueDate || '')}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 py-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
              <div className="font-medium">{editedData?.InvoiceNumber || 'No number'}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
              {isEditing ? (
                <Input
                  value={editedData?.Reference || ''}
                  onChange={(e) => setEditedData({ ...editedData, Reference: e.target.value })}
                  placeholder="Enter reference"
                  className="h-8"
                />
              ) : (
                <div className={`py-1 px-2 rounded text-sm ${!editedData?.Reference ? 'bg-yellow-100 text-yellow-800' : ''}`}>
                  {editedData?.Reference || 'No reference'}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
              <div>{editedData?.CurrencyCode || 'AUD'}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Items</Label>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-0 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
                <div className="col-span-1 p-2 text-center">Item</div>
                <div className="col-span-4 p-2 border-l border-border">Description</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Qty.</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Unit Price</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Account</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Tax rate</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Amount</div>
              </div>

              {(editedData?.LineItems || []).map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-0 border-b border-border last:border-b-0 hover:bg-muted/20">
                  <div className="col-span-1 p-2 flex items-center justify-center">
                    <div className="text-sm">{index + 1}</div>
                  </div>
                  
                  <div className="col-span-4 p-2 border-l border-border">
                    {isEditing ? (
                      <Input
                        value={item.Description}
                        onChange={(e) => handleLineItemChange(index, 'Description', e.target.value)}
                        placeholder="Enter description"
                        className="h-8"
                      />
                    ) : (
                      <div className="text-sm">{item.Description || 'No description'}</div>
                    )}
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.Quantity || 1}</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={item.UnitAmount}
                        onChange={(e) => handleLineItemChange(index, 'UnitAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        className="h-8 text-center"
                      />
                    ) : (
                      <div className="text-sm">${item.UnitAmount?.toFixed(2) || '0.00'}</div>
                    )}
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.AccountCode} - Expenses</div>
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.TaxType === 'INPUT' ? 'GST (10%)' : item.TaxType}</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border flex items-center justify-center">
                    <div className="text-sm font-medium">${item.LineAmount?.toFixed(2) || '0.00'}</div>
                    {isEditing && (editedData?.LineItems || []).length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="h-6 w-6 p-0 ml-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
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
                <span>{formatCurrency(editedData?.SubTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total tax:</span>
                <span>{formatCurrency(editedData?.TotalTax || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <div className="flex items-center gap-2">
                  <span>AUD {formatCurrency(editedData?.Total || 0)}</span>
                  {amountMatches ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              {!amountMatches && (
                <div className="text-sm text-amber-600">
                  Difference: {formatCurrency((editedData?.Total || 0) - invoice.amount)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {editedData?.Status === 'DRAFT' && amountMatches && (
                  <Button onClick={handleApprove}>
                    Approve Bill
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={!amountMatches}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};