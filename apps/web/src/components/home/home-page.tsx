import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Heading } from "@/components/layout/heading";
import { DestinationBento } from "@/components/home/destination-bento";
import { HeroKoiStack } from "@/components/home/hero-koi-stack";
import { LiveWarStrip } from "@/components/home/live-war-strip";
import { buttonVariants } from "@/components/ui/button";
import type { RosterResponse } from "@k0ii/schemas";
import { cn } from "@/lib/utils";

export function HomePage({
  data,
  error,
}: {
  data: RosterResponse | null;
  error: string | null;
}) {
  return (
    <div className="pond-page">
      <section
        className={cn(
          "animate-fade-rise",
          "flex flex-col justify-center gap-8",
          "min-h-[calc(100dvh-7.5rem)] py-2 sm:py-4 lg:min-h-0 lg:py-2",
          "lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10",
        )}
      >
        <div className="max-w-2xl space-y-5 lg:space-y-6">
          <h1
            className={cn(
              "font-display font-bold leading-none tracking-tight",
              "text-[clamp(3.1rem,12vw,5.5rem)]",
            )}
          >
            <span className="text-ink">K</span>
            <span className="text-ink">0</span>
            <span className="text-ink">ii</span>
          </h1>

          <p className="font-display text-[clamp(1.35rem,3.8vw,2rem)] font-semibold leading-snug tracking-tight text-ink">
            Keep score while you grind.
          </p>

          <p className="pond-lede max-w-md">
            Built for people who grind. Track K0i2 through every war.
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
            <Link
              href="/roster"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Jump to live battle
              <ArrowRight aria-hidden />
            </Link>
            <a
              href="https://discord.gg/k0iid"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              Join Discord
            </a>
          </div>
        </div>

        <div
          className="w-full animate-fade-rise"
          style={{ animationDelay: "70ms" }}
        >
          <HeroKoiStack />
        </div>
      </section>

      <section
        className="pond-section animate-fade-rise"
        style={{ animationDelay: "50ms" }}
      >
        <div className="pond-section-head">
          <Heading as="h2">Current Battle</Heading>
          <p className="max-w-xl text-base leading-relaxed text-ink-soft">
            Clan stats from the latest war.
          </p>
        </div>
        <LiveWarStrip data={data} error={error} />
      </section>

      <section
        className="pond-section animate-fade-rise"
        style={{ animationDelay: "90ms" }}
      >
        <div className="pond-section-head">
          <Heading as="h2">Around the Pond</Heading>
          <p className="max-w-xl text-base leading-relaxed text-ink-soft">
            Everything for the fight, and what comes after.
          </p>
        </div>
        <DestinationBento />
      </section>

      <section
        className={cn(
          "pond-card relative overflow-hidden animate-fade-rise",
          "bg-[linear-gradient(115deg,color-mix(in_srgb,var(--koi-orange)_14%,var(--card-surface)),var(--card-surface)_45%,color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface)))]",
          "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)]",
        )}
        style={{ animationDelay: "130ms" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light"
          style={{
            backgroundImage: "url(/pond/caustics.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-1/2 size-56 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_28%,transparent),transparent_70%)] blur-2xl"
          aria-hidden
        />

        <div className="relative grid items-center gap-6 p-6 sm:gap-8 sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-12 lg:p-10">
          <div className="space-y-4 text-left">
            <Heading as="h2" className="text-balance sm:text-[2rem]">
              See the fight while it moves.
            </Heading>
            <p className="max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
              Sort by pace, find carriers, and catch people slaking.
            </p>
            <Link
              href="/roster"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-1 inline-flex w-full sm:w-auto",
              )}
            >
              Jump to live battle
              <ArrowRight aria-hidden />
            </Link>
          </div>

          <div
            className="relative mx-auto flex w-full max-w-[17rem] items-end justify-end sm:max-w-[19rem] lg:mx-0 lg:w-56"
            aria-hidden
          >
            {/* Sits clear of the big koi rather than half-buried under it — it
                should read as a second fish, not a smudge on the first. */}
            <Image
              src="/badges/koi-6.png"
              alt=""
              width={120}
              height={120}
              className={cn(
                "absolute bottom-1 left-0 size-14 -rotate-12 opacity-70 sm:size-16",
                "animate-badge-bob object-contain drop-shadow-md",
              )}
              style={{ animationDelay: "0.6s" }}
            />
            <Image
              src="/badges/koi-8.png"
              alt=""
              width={180}
              height={180}
              className={cn(
                "relative z-[1] size-28 rotate-6 object-contain sm:size-36 lg:size-40",
                "animate-badge-bob",
                "drop-shadow-[0_14px_30px_color-mix(in_srgb,var(--pond-teal)_40%,transparent)]",
              )}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
