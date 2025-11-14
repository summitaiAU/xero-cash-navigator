import React from 'react';
import { ProcessedXeroData } from '@/types/invoice';
import { formatCurrency } from './utils';

interface MobileLineItemsProps {
  lineItems: ProcessedXeroData['lineItems'];
}

export const MobileLineItems = ({ lineItems }: MobileLineItemsProps) => {
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="mx-2 mt-3 p-4 bg-card border border-border rounded-xl shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">Line Items</h2>
        <p className="text-sm text-muted-foreground text-center py-4">No line items</p>
      </div>
    );
  }

  return (
    <div className="mx-2 mt-3 bg-card border border-border rounded-xl shadow-sm">
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
      </div>
      
      <div>
        {lineItems.map((item, index) => {
          const isLastItem = index === lineItems.length - 1;
          const gstAmount = item.lineGst !== undefined ? item.lineGst : 
                           (item.gstExempt ? 0 : 
                           (item.taxRate === 'GST (10%)' ? (item.lineTotalExGst || item.amount || 0) * 0.1 : 0));
          
          const lineTotal = item.lineTotalExGst || item.amount || (item.quantity * item.unitAmount) || 0;
          
          return (
            <div 
              key={index} 
              className={`p-3 active:bg-muted/50 ${!isLastItem ? 'border-b border-border/50' : ''}`}
            >
              {/* Row 1: Description */}
              <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1.5">
                {item.description || 'No description'}
              </div>
              
              {/* Row 2: Quantity × Unit Price */}
              <div className="text-xs text-muted-foreground mb-2 tabular-nums">
                {item.quantity} × {formatCurrency(item.unitAmount || 0)}
              </div>
              
              {/* Row 3: Account Code + GST Badges */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs bg-muted text-muted-foreground rounded-md px-2 py-1">
                  {item.account || 'N/A'}
                </div>
                <div className="flex gap-1">
                  {item.gstIncluded && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                      GST INCL
                    </span>
                  )}
                  {item.gstExempt && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">
                      GST EXMT
                    </span>
                  )}
                </div>
              </div>
              
              {/* Row 4: GST Amount + Line Total */}
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {item.gstExempt ? (
                    <span className="text-amber-700">GST: Exempt</span>
                  ) : (
                    <span>GST: {formatCurrency(gstAmount)}</span>
                  )}
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {formatCurrency(lineTotal)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
