import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Heading } from "@/components/layout/heading";
import { DestinationBento } from "@/components/home/destination-bento";
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
              "font-display font-bold leading-none tracking-tight pond-glow",
              "text-[clamp(3.1rem,12vw,5.5rem)]",
            )}
          >
            <span className="text-ink">K</span>
            <span className="text-ink">0</span>
            <span className="text-ink">ii</span>
          </h1>

          <p className="pond-glow-teal font-display text-[clamp(1.35rem,3.8vw,2rem)] font-semibold leading-snug tracking-tight text-ink">
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
          className="flex w-full animate-fade-rise justify-center"
          style={{ animationDelay: "70ms" }}
        >
          <Image
            src="/badges/koi-2.png"
            alt="Huge Koi Fish"
            width={640}
            height={640}
            priority
            className={cn(
              "w-full max-w-[18rem] object-contain sm:max-w-[22rem] lg:max-w-[26rem]",
              "animate-badge-bob",
              "drop-shadow-[0_18px_38px_color-mix(in_srgb,var(--pond-teal)_45%,transparent)]",
            )}
          />
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

    </div>
  );
}
