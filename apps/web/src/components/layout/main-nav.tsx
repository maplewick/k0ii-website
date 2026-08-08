"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  DISCORD_URL,
  JOIN_LINK,
  MORE_LINKS,
  NAV_LINKS,
  Wordmark,
} from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ease = "duration-200 ease-[var(--ease-out)]";

function pathActive(pathname: string, href: string) {
  const base = href.split("?")[0] ?? href;
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5",
        "font-sans text-sm font-semibold tracking-tight",
        "transition-[color,background-color,transform] " + ease,
        "active:scale-[0.97] motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
        active
          ? "bg-[color-mix(in_srgb,var(--koi-orange)_16%,var(--card-surface))] text-koi shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_28%,transparent)]"
          : cn(
              "text-ink-soft",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-[color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface))]",
              "[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink",
            ),
      )}
    >
      {label}
    </Link>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const mobileId = useId();
  const moreMenuId = useId();

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!moreOpen && !menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMoreOpen(false);
      setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen, menuOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (moreWrapRef.current?.contains(target)) return;
      setMoreOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [moreOpen]);

  const moreActive = MORE_LINKS.some((link) => pathActive(pathname, link.href));

  return (
    <header className="sticky top-0 z-30 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
      <div className="mx-auto max-w-7xl rounded-[var(--radius-card)] bg-card-surface shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]">
        <div className="flex h-14 items-center gap-2 px-2.5 sm:h-16 sm:gap-3 sm:px-3">
          <div className="shrink-0">
            <Wordmark />
          </div>

          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              )}
            >
              {NAV_LINKS.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>

            <div ref={moreWrapRef} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls={moreMenuId}
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5",
                  "font-sans text-sm font-semibold tracking-tight",
                  "transition-[color,background-color,transform] " + ease,
                  "active:scale-[0.97] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
                  moreOpen || moreActive
                    ? "bg-[color-mix(in_srgb,var(--koi-orange)_16%,var(--card-surface))] text-koi shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--koi-orange)_28%,transparent)]"
                    : cn(
                        "text-ink-soft",
                        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-[color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface))]",
                        "[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink",
                      ),
                )}
              >
                More
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform " + ease,
                    moreOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {moreOpen ? (
                <div
                  id={moreMenuId}
                  role="menu"
                  className={cn(
                    "absolute top-full right-0 z-50 mt-1.5 min-w-[11rem] origin-top-right",
                    "rounded-[var(--radius-input)] bg-card-surface p-1.5",
                    "shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
                    "animate-[hub-panel-in_160ms_var(--ease-out)_both] motion-reduce:animate-none",
                  )}
                >
                  {MORE_LINKS.map((link) => {
                    const active = pathActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        role="menuitem"
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center rounded-[var(--radius-input)] px-3 text-sm font-semibold",
                          "transition-[background-color,color,transform] " + ease,
                          "active:scale-[0.97] motion-reduce:active:scale-100",
                          active
                            ? "bg-[color-mix(in_srgb,var(--koi-orange)_14%,transparent)] text-koi"
                            : "text-ink-soft [@media(hover:hover)_and_(pointer:fine)]:hover:bg-card-surface-alt [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={JOIN_LINK.href}
              className={cn(
                buttonVariants({ size: "sm", variant: "secondary" }),
                "hidden sm:inline-flex",
              )}
            >
              {JOIN_LINK.label}
            </Link>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "sm" }), "hidden lg:inline-flex")}
            >
              Discord
            </a>
            <ThemeToggle />
            <Button
              variant="secondary"
              size="icon"
              className="md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls={mobileId}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id={mobileId}
            aria-label="Mobile"
            className={cn(
              "border-t border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] md:hidden",
              "origin-top animate-[hub-panel-in_180ms_var(--ease-out)_both] motion-reduce:animate-none",
            )}
          >
            <div className="flex max-h-[min(70dvh,28rem)] flex-col gap-0.5 overflow-y-auto px-2 py-2">
              {[...NAV_LINKS, ...MORE_LINKS].map((link) => {
                const active = pathActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-[var(--radius-input)] px-3 py-2.5",
                      "font-sans text-base font-semibold",
                      "transition-[background-color,color,transform] " + ease,
                      "active:scale-[0.97] motion-reduce:active:scale-100",
                      active
                        ? "bg-[color-mix(in_srgb,var(--koi-orange)_14%,transparent)] text-koi"
                        : "text-ink-soft",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] px-3 py-3 sm:hidden">
              <Link
                href={JOIN_LINK.href}
                onClick={() => setMenuOpen(false)}
                className={cn(buttonVariants({ size: "default" }), "w-full")}
              >
                {JOIN_LINK.label}
              </Link>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "default", variant: "secondary" }),
                  "w-full",
                )}
              >
                Discord
              </a>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
