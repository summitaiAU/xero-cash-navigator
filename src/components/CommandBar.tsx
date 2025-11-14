import React from 'react';
import { 
  RefreshCw, 
  Mail, 
  ChevronLeft, 
  ChevronRight, 
  Flag,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface CommandBarProps {
  onRefresh: () => void;
  onOpenEmail: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFlag?: () => void;
  status: string;
  canGoBack: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalCount: number;
  loading?: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onRefresh,
  onOpenEmail,
  onPrevious,
  onNext,
  onFlag,
  status,
  canGoBack,
  canGoNext,
  currentIndex,
  totalCount,
  loading
}) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'PAID':
        return {
          label: 'Paid',
          className: 'bg-success/10 text-success border-success/20'
        };
      case 'FLAGGED':
        return {
          label: 'Flagged',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      case 'READY':
      case 'APPROVED':
        return {
          label: 'Ready',
          className: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'PARTIALLY_PAID':
        return {
          label: 'Partial',
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      default:
        return {
          label: 'Review',
          className: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className="command-bar">
      {/* Quick Actions Group */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="hover:bg-muted"
      >
        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
        Refresh
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenEmail}
        className="hover:bg-muted"
      >
        <Mail className="h-4 w-4 mr-2" />
        Email
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Navigation Group */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          disabled={!canGoBack}
          className="h-8 w-8 hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm text-muted-foreground px-3 font-medium">
          {currentIndex + 1} / {totalCount}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!canGoNext}
          className="h-8 w-8 hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {onFlag && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onFlag}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Flag className="h-4 w-4 mr-2" />
            Flag
          </Button>
        </>
      )}

      <div className="flex-1" />

      {/* Status Badge */}
      <Badge 
        variant="outline" 
        className={cn('badge-status', statusConfig.className)}
      >
        {statusConfig.label}
      </Badge>
    </div>
  );
};
