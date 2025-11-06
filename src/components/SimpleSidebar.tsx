import React from "react";
import { FileText, CheckCircle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "payable" | "paid" | "flagged";

export const SimpleSidebar = React.memo(function SimpleSidebar({
  viewState,
  onViewStateChange,
  payableCount = 0,
  paidCount = 0,
  flaggedCount = 0,
}: {
  viewState: View;
  onViewStateChange: (v: View) => void;
  payableCount?: number;
  paidCount?: number;
  flaggedCount?: number;
}) {
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
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {count > 0 && (
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

  return (
    <aside
      role="navigation"
      aria-label="Invoice categories"
      className="hidden lg:block fixed left-0 top-0 bottom-0 w-48 border-r bg-background p-3 space-y-2 z-40"
    >
      <Btn
        icon={FileText}
        label="Payable"
        count={payableCount}
        active={viewState === "payable"}
        onClick={() => onViewStateChange("payable")}
      />
      <Btn
        icon={CheckCircle}
        label="Paid"
        count={paidCount}
        active={viewState === "paid"}
        onClick={() => onViewStateChange("paid")}
      />
      <Btn
        icon={Flag}
        label="Flagged"
        count={flaggedCount}
        active={viewState === "flagged"}
        onClick={() => onViewStateChange("flagged")}
      />
    </aside>
  );
});

