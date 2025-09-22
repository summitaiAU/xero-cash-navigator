import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, RefreshCw, Mail, CheckCircle, Flag, AlertTriangle } from 'lucide-react';
import { AddInvoiceButton } from './AddInvoiceButton';
import { Invoice } from '@/types/invoice';

interface InvoiceNavigationProps {
  currentIndex: number;
  totalInvoices: number;
  onPrevious: () => void;
  onNext: () => void;
  completedCount: number;
  emailLink?: string;
  invoices: Invoice[];
  viewState: 'payable' | 'paid' | 'flagged';
  onViewStateChange: (state: 'payable' | 'paid' | 'flagged') => void;
  onJumpToInvoice: (index: number) => void;
}

export const InvoiceNavigation: React.FC<InvoiceNavigationProps> = ({
  currentIndex,
  totalInvoices,
  onPrevious,
  onNext,
  completedCount,
  emailLink,
  invoices,
  viewState,
  onViewStateChange,
  onJumpToInvoice
}) => {
  const progressPercentage = totalInvoices > 0 ? (completedCount / totalInvoices) * 100 : 0;
  const hasNext = currentIndex < totalInvoices - 1;
  const hasPrevious = currentIndex > 0;
  const safeInvoices = invoices ?? [];
  const safeIndex = safeInvoices.length ? Math.min(currentIndex, safeInvoices.length - 1) : 0;
  const currentInvoice = safeInvoices.length ? safeInvoices[safeIndex] : undefined;
  const isPaidStatus = currentInvoice?.status === 'PAID';
  const isFlaggedStatus = currentInvoice?.status === 'FLAGGED';

  const getStatusIcon = () => {
    if (isPaidStatus) return <CheckCircle className="h-4 w-4" />;
    if (isFlaggedStatus) return <Flag className="h-4 w-4" />;
    return null;
  };

  const getStatusText = () => {
    if (isPaidStatus) return 'PAID';
    if (isFlaggedStatus) return 'FLAGGED';
    return null;
  };

  const getStatusColor = () => {
    if (isPaidStatus) return 'text-green-600 bg-green-100';
    if (isFlaggedStatus) return 'text-amber-600 bg-amber-100';
    return '';
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className={`hidden lg:block dashboard-card p-4 ${isPaidStatus ? 'ring-2 ring-green-500 ring-opacity-50' : isFlaggedStatus ? 'ring-2 ring-amber-500 ring-opacity-50' : ''}`}>
        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Tabs value={viewState} onValueChange={onViewStateChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payable">Payable</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="flagged">Flagged</TabsTrigger>
              </TabsList>
            </Tabs>
            {(isPaidStatus || isFlaggedStatus) && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                {getStatusIcon()}
                {getStatusText()}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Dropdown and Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Invoice Dropdown */}
            <div className="flex flex-col gap-2">
              <Select value={safeIndex.toString()} onValueChange={(value) => onJumpToInvoice(parseInt(value))}>
                <SelectTrigger className="w-80">
                  <SelectValue>
                    {currentInvoice && (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{currentInvoice.invoice_number}</span>
                        <span className="text-sm text-muted-foreground">{currentInvoice.supplier}</span>
                        <span className="text-sm font-medium">${currentInvoice.amount.toLocaleString()}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {safeInvoices.map((invoice, index) => (
                    <SelectItem key={invoice.id} value={index.toString()}>
                      <div className="flex items-center gap-4 w-full min-w-0">
                        <span className="font-medium truncate flex-shrink-0 min-w-[80px]">{invoice.invoice_number}</span>
                        <span className="text-sm text-muted-foreground truncate flex-1">{invoice.supplier}</span>
                        <span className="text-sm font-medium whitespace-nowrap flex-shrink-0">${invoice.amount.toLocaleString()}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Invoice {currentIndex + 1} of {totalInvoices} • {viewState === 'paid' ? 'Paid' : viewState === 'flagged' ? 'Flagged' : completedCount + ' completed'}
              </div>
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
          <Progress 
            value={progressPercentage} 
            variant={viewState === 'paid' ? 'success' : 'default'}
            className={`h-2 ${isPaidStatus ? 'border border-green-500' : isFlaggedStatus ? 'border border-amber-500' : ''}`} 
          />
        </div>
      </div>

      {/* Mobile/Tablet Floating Navigation */}
      <div className="lg:hidden sticky top-4 z-10 mx-4">
        <div className={`bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-lg ${isPaidStatus ? 'ring-1 ring-green-500' : isFlaggedStatus ? 'ring-1 ring-amber-500' : ''}`}>
          {/* Mobile Filter Tabs */}
          <div className="flex items-center justify-center mb-3">
            <Tabs value={viewState} onValueChange={onViewStateChange}>
              <TabsList className="grid w-full grid-cols-3 text-xs h-8">
                <TabsTrigger value="payable" className="text-xs px-2">Payable</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs px-2">Paid</TabsTrigger>
                <TabsTrigger value="flagged" className="text-xs px-2">Flagged</TabsTrigger>
              </TabsList>
            </Tabs>
            {(isPaidStatus || isFlaggedStatus) && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor()}`}>
                {getStatusIcon()}
                {getStatusText()}
              </div>
            )}
          </div>
          
          {/* Mobile Invoice Dropdown */}
          <div className="mb-3">
            <Select value={safeIndex.toString()} onValueChange={(value) => onJumpToInvoice(parseInt(value))}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue>
                  {currentInvoice && (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium truncate flex-1">{currentInvoice.invoice_number}</span>
                      <span className="text-xs text-muted-foreground mx-1 truncate">{currentInvoice.supplier}</span>
                      <span className="text-xs font-medium whitespace-nowrap">${currentInvoice.amount.toLocaleString()}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 z-50">
                {safeInvoices.map((invoice, index) => (
                  <SelectItem key={invoice.id} value={index.toString()}>
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <span className="font-medium truncate text-xs flex-shrink-0 min-w-[60px]">{invoice.invoice_number}</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">{invoice.supplier}</span>
                      <span className="text-xs font-medium whitespace-nowrap flex-shrink-0">${invoice.amount.toLocaleString()}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {currentIndex + 1}/{totalInvoices}
              </span>
              <span className="text-xs text-muted-foreground">
                {viewState === 'paid' ? 'Paid' : viewState === 'flagged' ? 'Flagged' : completedCount + ' done'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <AddInvoiceButton isMobile={true} />
              
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
                <Progress 
                  value={progressPercentage} 
                  variant={viewState === 'paid' ? 'success' : 'default'}
                  className={`h-1 ${isPaidStatus ? 'border border-green-500' : isFlaggedStatus ? 'border border-amber-500' : ''}`} 
                />
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