import React from 'react';
import { 
  FileText, 
  CheckCircle, 
  Flag, 
  LogOut, 
  User,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavigationRailProps {
  viewState: 'payable' | 'paid' | 'flagged';
  onViewStateChange: (state: 'payable' | 'paid' | 'flagged') => void;
  onSignOut: () => void;
  userName?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  payableCount: number;
  paidCount: number;
  flaggedCount: number;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  viewState,
  onViewStateChange,
  onSignOut,
  userName,
  isCollapsed,
  onToggleCollapse,
  payableCount,
  paidCount,
  flaggedCount,
}) => {
  const NavItem = ({ 
    icon: Icon, 
    label, 
    active, 
    onClick,
    badge
  }: { 
    icon: any; 
    label: string; 
    active?: boolean; 
    onClick: () => void;
    badge?: number;
  }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'nav-rail-item',
              active && 'active'
            )}
          >
            <Icon className="h-5 w-5" />
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted text-foreground text-[10px] font-bold flex items-center justify-center border border-border">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <nav className={cn(
      'nav-rail',
      isCollapsed ? 'w-20' : 'w-64'
    )}>
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="nav-rail-item mb-4"
      >
        {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </button>

      {/* Logo/Brand Area */}
      <div className="mb-8 px-4">
        {isCollapsed ? (
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold text-nav-rail-foreground">Invoice Console</h2>
            <p className="text-xs text-nav-rail-foreground/60 mt-1">Payment Management</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 space-y-2">
        <NavItem
          icon={FileText}
          label="Payable Invoices"
          active={viewState === 'payable'}
          onClick={() => onViewStateChange('payable')}
          badge={payableCount}
        />
        <NavItem
          icon={CheckCircle}
          label="Paid Invoices"
          active={viewState === 'paid'}
          onClick={() => onViewStateChange('paid')}
          badge={paidCount}
        />
        <NavItem
          icon={Flag}
          label="Flagged Invoices"
          active={viewState === 'flagged'}
          onClick={() => onViewStateChange('flagged')}
          badge={flaggedCount}
        />
      </div>

      {/* Bottom Section */}
      <div className="space-y-2 mt-auto">
        {userName && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="nav-rail-item cursor-default">
                  <User className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>{userName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <NavItem
          icon={LogOut}
          label="Sign Out"
          onClick={onSignOut}
        />
      </div>
    </nav>
  );
};
