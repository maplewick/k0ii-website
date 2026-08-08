import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-full border border-transparent",
    "font-display text-sm font-semibold whitespace-nowrap",
    "transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-out)]",
    "outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-pond-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97] motion-reduce:active:scale-100",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-koi text-white shadow-[var(--shadow-button)]",
          "hover:bg-koi-deep hover:-translate-y-0.5 active:translate-y-0",
          "disabled:shadow-none",
        ].join(" "),
        secondary: [
          "border-2 border-koi bg-card-surface-alt text-ink shadow-none",
          "hover:bg-accent hover:-translate-y-0.5 active:translate-y-0",
        ].join(" "),
        outline: [
          "border-2 border-pond-teal bg-card-surface-alt text-ink shadow-none",
          "hover:bg-accent hover:-translate-y-0.5 active:translate-y-0",
        ].join(" "),
        ghost: "bg-transparent text-ink-soft shadow-none hover:bg-card-surface-alt hover:text-koi",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 gap-1.5 px-4 text-sm",
        lg: "h-12 gap-2.5 px-7 text-base",
        icon: "size-10 rounded-full p-0 shadow-[var(--shadow-button)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export { buttonVariants };
