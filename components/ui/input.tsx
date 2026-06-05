import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border-[2.5px] border-ink bg-card px-4 py-2 text-base font-sans text-ink",
          "placeholder:text-muted-foreground/70",
          "focus-visible:outline-none focus-visible:shadow-[3px_3px_0_0_#22C55E] focus-visible:border-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-shadow duration-200",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
