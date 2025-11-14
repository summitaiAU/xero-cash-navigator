import React from 'react';
import { CheckCircle } from 'lucide-react';
import { formatCurrency } from './utils';

interface MobileTotalsProps {
  subtotal: number;
  totalTax: number;
  total: number;
  isApproved?: boolean;
}

export const MobileTotals = ({ subtotal, totalTax, total, isApproved }: MobileTotalsProps) => {
  return (
    <div className="mx-2 mt-3 p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="space-y-2">
        {/* Subtotal Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="text-sm font-medium tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        
        {/* Tax Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total tax:</span>
          <span className="text-sm font-medium tabular-nums">{formatCurrency(totalTax)}</span>
        </div>
        
        {/* Divider */}
        <div className="border-t border-border/50 my-2" />
        
        {/* Total Row */}
        <div className="flex justify-between items-center">
          <span className="text-base font-bold">Total:</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tabular-nums">{formatCurrency(total)}</span>
            {isApproved && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
