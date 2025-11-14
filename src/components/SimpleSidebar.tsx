import React from "react";
import { FileText, CheckCircle, Flag, ChevronLeft, ChevronRight, Mail, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import SodhiLogo from "@/assets/sodhi-logo.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type View = "payable" | "paid" | "flagged";

export const SimpleSidebar = React.memo(function SimpleSidebar({
  viewState,
  onViewStateChange,
  payableCount = 0,
  paidCount = 0,
  flaggedCount = 0,
  reviewCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onSignOut,
  userName,
}: {
  viewState: View;
  onViewStateChange: (v: View) => void;
  payableCount?: number;
  paidCount?: number;
  flaggedCount?: number;
  reviewCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
  userName?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const Btn = ({
    icon: Icon,
    label,
    count,
    active,
    onClick,
  }: {
    icon: any;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
  }) => {
    const button = (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-current={active ? "page" : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all duration-300 relative",
          active
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted text-foreground",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className={cn("flex items-center gap-3 min-w-0 flex-1")}>
          <Icon className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </div>
        {isCollapsed && count > 0 && (
          <span
            className={cn(
              "absolute top-0 right-0 text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center rounded-full",
              active
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
            )}
          >
            {count}
          </span>
        )}
        {!isCollapsed && count > 0 && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              active
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {count}
          </span>
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label} {count > 0 && `(${count})`}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        role="navigation"
        aria-label="Invoice categories"
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 border-r bg-background p-3 flex flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-48"
        )}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Logo */}
        <div className={cn(
          "mb-4 pb-3 border-b border-border flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-start px-2"
        )}>
          <img 
            src={SodhiLogo} 
            alt="Sodhi Logo" 
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "h-6 w-6" : "h-8 w-auto"
            )}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex-1 space-y-2">
          <Btn
            icon={FileText}
            label="Payable"
            count={payableCount}
            active={viewState === "payable" && location.pathname === "/dashboard"}
            onClick={() => navigate("/dashboard?view=payable")}
          />
          <Btn
            icon={Flag}
            label="Flagged"
            count={flaggedCount}
            active={viewState === "flagged" && location.pathname === "/dashboard"}
            onClick={() => navigate("/dashboard?view=flagged")}
          />
          <Btn
            icon={Mail}
            label="Review"
            count={reviewCount}
            active={location.pathname === "/review"}
            onClick={() => navigate("/review")}
          />

          {/* Horizontal Divider */}
          <div className="pt-4 mt-4 border-t border-border">
            <Btn
              icon={CheckCircle}
              label="All Invoices"
              count={0}
              active={location.pathname === "/invoices/paid"}
              onClick={() => navigate("/invoices/paid")}
            />
          </div>
        </div>

        {/* Bottom Section - User & Sign Out */}
        {(userName || onSignOut) && (
          <div className="space-y-2 mt-auto border-t border-border pt-3">
            {userName && (
              <Btn
                icon={User}
                label={userName}
                count={0}
                active={false}
                onClick={() => {}}
              />
            )}
            {onSignOut && (
              <Btn
                icon={LogOut}
                label="Sign Out"
                count={0}
                active={false}
                onClick={onSignOut}
              />
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
});
