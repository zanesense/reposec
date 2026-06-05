import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border-[2px] border-ink px-2.5 py-0.5 text-xs font-sans font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "bg-card text-foreground",
        critical: "bg-red-100 text-red-700 border-red-700",
        high: "bg-orange-100 text-orange-700 border-orange-700",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-700",
        low: "bg-blue-100 text-blue-700 border-blue-700",
        info: "bg-slate-100 text-slate-700 border-slate-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
