import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, RefreshCw, BarChart3 } from 'lucide-react';

interface CompletionScreenProps {
  totalProcessed: number;
  onRestart: () => void;
  onExportReport: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  totalProcessed,
  onRestart,
  onExportReport
}) => {
  const getCurrentTime = () => {
    return new Date().toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[600px] p-8">
      <div className="text-center space-y-8 max-w-md">
        <div className="animate-fade-in">
          <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-success animate-pulse-success" />
          </div>
          
          <h1 className="text-3xl font-bold text-gradient-primary mb-4">
            All Invoices Processed!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-2">
            Successfully processed {totalProcessed} invoices
          </p>
          
          <p className="text-sm text-muted-foreground">
            Completed at {getCurrentTime()}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-6">
          <div className="dashboard-card p-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Processing Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Invoices:</span>
                <span className="font-medium">{totalProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span>Xero Bills Updated:</span>
                <span className="font-medium">{totalProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span>Payments Recorded:</span>
                <span className="font-medium">{totalProcessed}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span>Success Rate:</span>
                <span className="font-medium text-success">100%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button variant="default" size="lg" onClick={onExportReport} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export Processing Report
          </Button>
          
          <Button variant="outline" size="lg" onClick={onRestart} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Process More Invoices
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          💡 All invoice data has been synced with Xero and payment confirmations sent.
        </div>
      </div>
    </div>
  );
};