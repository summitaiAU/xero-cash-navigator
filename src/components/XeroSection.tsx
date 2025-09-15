import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  loading?: boolean;
}

export const XeroSection: React.FC<XeroSectionProps> = ({ 
  invoice, 
  onUpdate, 
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

  const amountMatches = Math.abs(editedData.total - invoice.amount) < 0.01;

  return (
    <div className="dashboard-card p-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            <p className="text-sm text-muted-foreground">Loading Xero data...</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="section-header mb-0">Xero Invoice</h3>
          {editedData.status === 'DRAFT' && (
            <Badge className="badge-draft">Draft</Badge>
          )}
          {editedData.status === 'AWAITING_PAYMENT' && (
            <Badge className="badge-success">Awaiting Payment</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open(`https://xero.com/bill/${invoice.xero_bill_id}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Xero
          </Button>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            {isEditing ? (
              <Input
                id="reference"
                value={editedData.reference}
                onChange={(e) => setEditedData({ ...editedData, reference: e.target.value })}
                placeholder="Enter reference"
              />
            ) : (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted">
                {editedData.reference || 'No reference'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted font-medium">
              {formatCurrency(invoice.amount)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            {isEditing ? (
              <Select
                value={editedData.account_code}
                onValueChange={(value) => setEditedData({ ...editedData, account_code: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted">
                {accountOptions.find(opt => opt.value === editedData.account_code)?.label || 'Not selected'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate</Label>
            {isEditing ? (
              <Select
                value={editedData.tax_rate.toString()}
                onValueChange={(value) => {
                  const newTaxRate = parseInt(value);
                  const newLineItems = editedData.line_items.map(item => ({
                    ...item,
                    tax_amount: (item.amount * newTaxRate) / 100
                  }));
                  const totals = calculateTotals(newLineItems);
                  setEditedData({
                    ...editedData,
                    tax_rate: newTaxRate,
                    line_items: newLineItems,
                    ...totals
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxRateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted">
                {editedData.tax_rate}%
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Line Items</Label>
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {editedData.line_items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border border-border rounded-lg">
                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Input
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="Enter description"
                    />
                  ) : (
                    <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted text-sm">
                      {item.description}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleLineItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      step="0.01"
                    />
                  ) : (
                    <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted text-sm">
                      {formatCurrency(item.amount)}
                    </div>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Tax</Label>
                    <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted text-sm">
                      {formatCurrency(item.tax_amount)}
                    </div>
                  </div>
                  {isEditing && editedData.line_items.length > 1 && (
                    <Button
                      variant="ghost-destructive"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(editedData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{formatCurrency(editedData.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-medium border-t border-border pt-2">
              <span>Total:</span>
              <div className="flex items-center gap-2">
                <span>{formatCurrency(editedData.total)}</span>
                {amountMatches ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                )}
              </div>
            </div>
            {!amountMatches && (
              <div className="text-sm text-warning">
                Difference: {formatCurrency(editedData.total - invoice.amount)}
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
              {editedData.status === 'DRAFT' && amountMatches && (
                <Button variant="success" onClick={handleApprove}>
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
              <Button variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};