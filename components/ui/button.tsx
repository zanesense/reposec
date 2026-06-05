import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold transition-all duration-200 cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground border-[2.5px] border-ink shadow-[3px_3px_0_0_#1a1a1a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#1a1a1a]",
        secondary:
          "bg-secondary text-secondary-foreground border-[2.5px] border-ink shadow-[3px_3px_0_0_#1a1a1a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#1a1a1a]",
        outline:
          "bg-card text-foreground border-[2.5px] border-ink hover:bg-muted hover:-translate-y-0.5",
        ghost:
          "bg-transparent text-foreground hover:bg-muted border-[2.5px] border-transparent",
        destructive:
          "bg-destructive text-destructive-foreground border-[2.5px] border-ink shadow-[3px_3px_0_0_#1a1a1a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1a1a1a]",
        link: "text-ink underline decoration-marker decoration-[3px] underline-offset-4 hover:text-marker",
      },
      size: {
        default: "h-11 rounded-xl px-4 text-sm",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
