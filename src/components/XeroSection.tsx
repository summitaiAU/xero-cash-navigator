import React, { useState } from 'react';
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
import { Invoice, LineItem } from '@/types/invoice';
import { accountOptions, taxRateOptions } from '@/data/mockData';
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
  const { toast } = useToast();

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

  const calculateTotals = (lineItems: LineItem[]) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newLineItems = [...editedData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    // Recalculate tax if amount changes
    if (field === 'amount') {
      newLineItems[index].tax_amount = (value * editedData.tax_rate) / 100;
    }
    
    const totals = calculateTotals(newLineItems);
    setEditedData({
      ...editedData,
      line_items: newLineItems,
      ...totals
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      description: '',
      amount: 0,
      tax_amount: 0,
      account_code: editedData.account_code
    };
    
    setEditedData({
      ...editedData,
      line_items: [...editedData.line_items, newItem]
    });
  };

  const removeLineItem = (index: number) => {
    const newLineItems = editedData.line_items.filter((_, i) => i !== index);
    const totals = calculateTotals(newLineItems);
    setEditedData({
      ...editedData,
      line_items: newLineItems,
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
    setEditedData(invoice.xero_data);
    setIsEditing(false);
  };

  const handleApprove = async () => {
    try {
      await onUpdate({ ...editedData, status: 'AWAITING_PAYMENT' });
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

  const amountMatches = Math.abs((editedData?.total || 0) - invoice.amount) < 0.01;
  const hasXeroData = invoice.xero_data && Object.keys(invoice.xero_data).length > 0;

  return (
    <div className="dashboard-card p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="section-header mb-0">Xero Invoice</h3>
          {hasXeroData && editedData.status === 'DRAFT' && (
            <Badge variant="secondary">Draft</Badge>
          )}
          {hasXeroData && editedData.status === 'AWAITING_PAYMENT' && (
            <Badge variant="default">Awaiting Payment</Badge>
          )}
          {hasXeroData && editedData.status === 'AUTHORISED' && (
            <Badge variant="default">Authorised</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSync} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync'}
          </Button>
          {invoice.xero_bill_id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${invoice.xero_bill_id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Xero
            </Button>
          )}
        </div>
      </div>

      {loading ? (
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
          <Button onClick={onSync} variant="outline">
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
              <div className="font-medium">{editedData?.contact || invoice.supplier || 'No contact'}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
              <div>{formatDate(editedData?.date || '')}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <div>{formatDate(editedData?.due_date || invoice.due_date)}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 py-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Invoice Number</Label>
              <div className="font-medium">{invoice.invoice_number || 'No number'}</div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
              {isEditing ? (
                <Input
                  value={editedData?.reference || ''}
                  onChange={(e) => setEditedData({ ...editedData, reference: e.target.value })}
                  placeholder="Enter reference"
                  className="h-8"
                />
              ) : (
                <div className={`py-1 px-2 rounded text-sm ${!editedData?.reference ? 'bg-yellow-100 text-yellow-800' : ''}`}>
                  {editedData?.reference || 'No reference'}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
              <div>Australian Dollar</div>
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
                <div className="col-span-1 p-2 border-l border-border text-center">Price</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Account</div>
                <div className="col-span-2 p-2 border-l border-border text-center">Tax rate</div>
                <div className="col-span-1 p-2 border-l border-border text-center">Amount</div>
              </div>

              {(editedData?.line_items || []).map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-0 border-b border-border last:border-b-0 hover:bg-muted/20">
                  <div className="col-span-1 p-2 flex items-center justify-center">
                    <div className="text-sm">{index + 1}</div>
                  </div>
                  
                  <div className="col-span-4 p-2 border-l border-border">
                    {isEditing ? (
                      <Input
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Enter description"
                        className="h-8"
                      />
                    ) : (
                      <div className="text-sm">{item.description || 'No description'}</div>
                    )}
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    <div className="text-sm">1</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleLineItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        className="h-8 text-center"
                      />
                    ) : (
                      <div className="text-sm">${item.amount.toFixed(2)}</div>
                    )}
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">{item.account_code} - Expenses</div>
                  </div>
                  
                  <div className="col-span-2 p-2 border-l border-border text-center">
                    <div className="text-sm">GST (10%)</div>
                  </div>
                  
                  <div className="col-span-1 p-2 border-l border-border flex items-center justify-center">
                    <div className="text-sm font-medium">${(item.amount + item.tax_amount).toFixed(2)}</div>
                    {isEditing && (editedData?.line_items || []).length > 1 && (
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
                <span>{formatCurrency(editedData?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total tax:</span>
                <span>{formatCurrency(editedData?.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <div className="flex items-center gap-2">
                  <span>AUD {formatCurrency(editedData?.total || 0)}</span>
                  {amountMatches ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              {!amountMatches && (
                <div className="text-sm text-amber-600">
                  Difference: {formatCurrency((editedData?.total || 0) - invoice.amount)}
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
                {editedData?.status === 'DRAFT' && amountMatches && (
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