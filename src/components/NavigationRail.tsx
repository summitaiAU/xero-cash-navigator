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
import SodhiLogo from '@/assets/sodhi-logo.svg';

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
      'nav-rail transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-60'
    )}>
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="nav-rail-item mb-4"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </button>

      {/* Logo/Brand Area - Clickable to go to Payable */}
      <button
        onClick={() => onViewStateChange('payable')}
        className="mb-8 px-4 w-full hover:opacity-80 transition-opacity"
        aria-label="Go to Payable Invoices"
      >
        {isCollapsed ? (
          <div className="w-10 h-10 mx-auto">
            <img src={SodhiLogo} alt="Sodhi Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0">
              <img src={SodhiLogo} alt="Sodhi Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-nav-rail-foreground leading-tight">Invoice Console</h2>
              <p className="text-xs text-nav-rail-foreground/60 mt-0.5">Payment Management</p>
            </div>
          </div>
        )}
      </button>

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
      <div className="space-y-2 mt-auto border-t border-nav-rail-foreground/10 pt-4">
        {userName && !isCollapsed && (
          <div className="px-4 py-2 text-sm text-nav-rail-foreground/60">
            {userName}
          </div>
        )}
        
        <NavItem
          icon={User}
          label={userName || 'Profile'}
          onClick={() => {}}
        />
        
        <NavItem
          icon={LogOut}
          label="Sign Out"
          onClick={onSignOut}
        />
      </div>
    </nav>
  );
};
