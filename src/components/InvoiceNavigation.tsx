import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface InvoiceNavigationProps {
  currentIndex: number;
  totalInvoices: number;
  onPrevious: () => void;
  onNext: () => void;
  onReset?: () => void;
  completedCount: number;
}

export const InvoiceNavigation: React.FC<InvoiceNavigationProps> = ({
  currentIndex,
  totalInvoices,
  onPrevious,
  onNext,
  onReset,
  completedCount
}) => {
  const progressPercentage = totalInvoices > 0 ? (completedCount / totalInvoices) * 100 : 0;
  const hasNext = currentIndex < totalInvoices - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            Invoice {currentIndex + 1} of {totalInvoices}
          </h2>
          <div className="text-sm text-muted-foreground">
            {completedCount} completed
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}% complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
    </div>
  );
};