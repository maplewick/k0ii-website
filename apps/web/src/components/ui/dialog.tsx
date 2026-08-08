"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50",
        "bg-[color-mix(in_srgb,var(--ink)_72%,transparent)]",
        "dark:bg-[color-mix(in_srgb,#02080e_78%,transparent)]",
        "backdrop-blur-md backdrop-saturate-150",
        "transition-[opacity,backdrop-filter] duration-200 ease-[var(--ease-out)]",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        "motion-reduce:backdrop-blur-none",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 outline-none",
          "max-h-[min(92dvh,calc(100dvh-1.5rem))] max-w-[calc(100%-1.25rem)] gap-4 overflow-y-auto overscroll-contain",
          "p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:gap-5 sm:p-6",
          "rounded-[var(--radius-card)]",
          "border-[1.5px] border-[color-mix(in_srgb,var(--pond-teal)_32%,transparent)]",
          "bg-[linear-gradient(155deg,color-mix(in_srgb,var(--card-surface)_92%,var(--pond-teal))_0%,var(--card-surface)_48%,color-mix(in_srgb,var(--card-surface)_88%,var(--ink))_100%)]",
          "text-ink shadow-[var(--shadow-modal)]",
          "dark:bg-[linear-gradient(155deg,color-mix(in_srgb,var(--card-surface)_88%,var(--pond-teal))_0%,var(--card-surface)_52%,color-mix(in_srgb,var(--card-surface)_82%,#000)_100%)]",
          "transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
          "data-starting-style:scale-[0.97] data-starting-style:opacity-0",
          "data-ending-style:scale-[0.97] data-ending-style:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 text-ink-soft transition-transform duration-150 ease-[var(--ease-out)] hover:text-koi active:scale-[0.97]"
                aria-label="Close"
              />
            }
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-8", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-[color-mix(in_srgb,var(--pond-teal)_20%,transparent)] pt-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-display text-xl font-bold leading-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-ink-soft", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
