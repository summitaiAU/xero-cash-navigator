import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, RefreshCw, Mail } from 'lucide-react';

interface InvoiceNavigationProps {
  currentIndex: number;
  totalInvoices: number;
  onPrevious: () => void;
  onNext: () => void;
  onReset?: () => void;
  completedCount: number;
  emailLink?: string;
}

export const InvoiceNavigation: React.FC<InvoiceNavigationProps> = ({
  currentIndex,
  totalInvoices,
  onPrevious,
  onNext,
  onReset,
  completedCount,
  emailLink
}) => {
  const progressPercentage = totalInvoices > 0 ? (completedCount / totalInvoices) * 100 : 0;
  const hasNext = currentIndex < totalInvoices - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:block dashboard-card p-4">
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
            {emailLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(emailLink, '_blank')}
                title="Open original email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Open Email
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
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

      {/* Mobile/Tablet Floating Navigation */}
      <div className="lg:hidden sticky top-4 z-10 mx-4">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {currentIndex + 1}/{totalInvoices}
              </span>
              <span className="text-xs text-muted-foreground">
                {completedCount} done
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {emailLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(emailLink, '_blank')}
                  className="h-8 w-8 p-0"
                  title="Open email"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="w-16 px-2">
                <Progress value={progressPercentage} className="h-1" />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!hasNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};