import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent text-primary-foreground" + " " + "bg-blue",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent text-destructive-foreground" + " " + "bg-destructive hover:bg-destructive/80",
        outline: "text-foreground",
        // Status-specific badges
        ready: "border-transparent text-white" + " " + "bg-blue",
        awaiting: "border-transparent" + " " + "text-[#92400E] bg-[#FEF3C7]",
        paid: "border-transparent" + " " + "text-[#065F46] bg-[#D1FAE5]",
        partial: "border-transparent" + " " + "text-[#92400E] bg-[#FFFBEB]",
        flagged: "border-transparent" + " " + "text-[#991B1B] bg-[#FEE2E2]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
