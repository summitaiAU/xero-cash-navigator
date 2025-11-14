import { FileText, Flag, Mail, CheckCircle, LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SodhiLogo from '@/assets/sodhi-logo.svg';

interface MobileHamburgerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewState: 'payable' | 'paid' | 'flagged';
  payableCount: number;
  flaggedCount: number;
  reviewCount: number;
  userName?: string;
  onSignOut?: () => void;
}

export const MobileHamburgerMenu = ({
  open,
  onOpenChange,
  viewState,
  payableCount,
  flaggedCount,
  reviewCount,
  userName,
  onSignOut,
}: MobileHamburgerMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigation = (path: string) => {
    if (isNavigating) return; // Prevent multiple clicks
    
    setIsNavigating(true);
    onOpenChange(false); // Start close animation
    
    // Wait for sheet animation to complete (300ms + buffer)
    setTimeout(() => {
      navigate(path);
      setIsNavigating(false);
    }, 350);
  };

  const NavButton = ({
    icon: Icon,
    label,
    count,
    active,
    onClick,
    disabled,
  }: {
    icon: any;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium',
        !disabled && 'transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full',
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <img src={SodhiLogo} alt="Sodhi Logo" className="h-8 w-auto" />
        </SheetHeader>

        <div className="flex-1 p-4 space-y-2">
          <NavButton
            icon={FileText}
            label="Payable"
            count={payableCount}
            active={viewState === 'payable' && location.pathname === '/dashboard'}
            onClick={() => handleNavigation('/dashboard?view=payable')}
            disabled={isNavigating}
          />
          <NavButton
            icon={Flag}
            label="Flagged"
            count={flaggedCount}
            active={viewState === 'flagged' && location.pathname === '/dashboard'}
            onClick={() => handleNavigation('/dashboard?view=flagged')}
            disabled={isNavigating}
          />
          <NavButton
            icon={Mail}
            label="Review"
            count={reviewCount}
            active={location.pathname === '/review'}
            onClick={() => handleNavigation('/review')}
            disabled={isNavigating}
          />

          <div className="pt-4 mt-4 border-t border-border">
            <NavButton
              icon={CheckCircle}
              label="All Invoices"
              active={location.pathname === '/invoices/paid'}
              onClick={() => handleNavigation('/invoices/paid')}
              disabled={isNavigating}
            />
          </div>
        </div>

        {(userName || onSignOut) && (
          <div className="p-4 border-t border-border space-y-2">
            {userName && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{userName}</span>
              </div>
            )}
            {onSignOut && (
              <button
                onClick={() => {
                  onSignOut();
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
