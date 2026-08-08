import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-koi text-white",
        secondary: "bg-card-surface-alt text-ink",
        success: "bg-lily text-white dark:text-[#0b1f2e]",
        info: "bg-pond-teal text-white dark:text-[#0b1f2e]",
        outline: "border-2 border-pond-teal/40 text-ink",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}
