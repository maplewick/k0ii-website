import Image from "next/image";
import Link from "next/link";

import { DISCORD_URL } from "@/components/layout/nav-config";
import { Heading } from "@/components/layout/heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * THESIS: Privacy as pond bento - same energy as join/rewards, not a legal PDF.
 * OWN-WORLD: Koi wash hero, Fredoka section heads, cream cards, teal contact strip.
 * STORY: Who we are → what we collect → how/why → contact + terms.
 * FIRST VIEWPORT: Title + lede + featured "What K0ii is" card.
 * FORM: Join/rewards Operate composition, web/privacy copy.
 */

const COLLECT = [
  {
    term: "Discord account data",
    body: "Your Discord user ID, username, and server roles, visible to the bot because it operates in the K0ii Discord server.",
  },
  {
    term: "Roblox account data",
    body: "Your Roblox user ID, username, and in-game clan/battle statistics, sourced from public APIs and Bloxlink for roster members.",
  },
  {
    term: "Donation records",
    body: "In-game gem donations logged by officers and linked to Discord accounts for leaderboards.",
  },
  {
    term: "Website analytics",
    body: "Google Analytics on the recruitment/join page collects standard web analytics. No other page currently uses analytics.",
  },
] as const;

const POLICY_BLOCKS = [
  {
    id: "how-we-use",
    title: "How we use this",
    body: "We use this information to display clan rosters and statistics, verify membership, track donations and rewards, and moderate applications and tickets.",
  },
  {
    id: "sharing",
    title: "Sharing",
    body: "We do not sell your information. It is shared only with services necessary to operate K0ii (Discord, Roblox, Bloxlink, and Google Analytics on the join page) and with clan officers for moderation.",
  },
  {
    id: "cookies",
    title: "Cookies",
    body: "The profile/officer login sets a secure signed session cookie. We don't use advertising or cross-site tracking cookies. Google Analytics may set its own cookie on the join page only.",
  },
  {
    id: "retention",
    title: "Retention & removal",
    body: "Data is retained while you're associated with the clan or its roster history. Ask any K0ii officer in Discord to review or remove your data.",
  },
  {
    id: "children",
    title: "Children's privacy",
    body: "K0ii is not directed at children under 13. If you believe a child has provided us information, contact us and we'll remove it.",
  },
  {
    id: "changes",
    title: "Changes",
    body: "We may update this policy as the bot and site evolve. Material changes will be reflected here with an updated date.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="pond-page">
      <header className="animate-fade-rise pond-section-head space-y-3">
        <Heading as="h1">
          Privacy <span className="text-koi">Policy</span>
        </Heading>
        <p className="pond-lede">
          How K0ii handles Discord, Roblox, and website data for the clan bot
          and dashboard.
        </p>
      </header>

      <section className="pond-section">
        <article
          className={cn(
            "pond-card relative overflow-hidden p-6 sm:p-8 lg:p-10",
            "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_22%,var(--card-surface)),var(--card-surface)_58%)]",
            "ring-2 ring-[color-mix(in_srgb,var(--koi-orange)_40%,transparent)]",
            "shadow-[var(--shadow-card-hover)]",
            "animate-fade-rise",
          )}
          style={{ animationDelay: "50ms" }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-12 size-52 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_40%,transparent),transparent_68%)] blur-2xl"
            aria-hidden
          />
          <Image
            src="/badges/koi-8.png"
            alt=""
            width={140}
            height={140}
            className="pointer-events-none absolute -right-2 bottom-0 size-28 opacity-45 drop-shadow-md sm:size-36"
          />
          <div className="relative max-w-xl space-y-3">
            <p className="pond-label">Unofficial fan project</p>
            <Heading as="h2" className="text-3xl sm:text-4xl">
              What K0ii is
            </Heading>
            <p className="text-base leading-relaxed text-ink sm:text-lg">
              An unofficial Discord bot and companion website built by and for a
              Pet Simulator 99 clan. Not affiliated with, endorsed by, or
              operated by Roblox Corporation, Big Games, or Discord Inc.
            </p>
          </div>
        </article>
      </section>

      <section className="pond-section">
        <div
          className="pond-section-head animate-fade-rise max-w-xl"
          style={{ animationDelay: "80ms" }}
        >
          <Heading as="h2">Information we collect</Heading>
          <p className="text-base leading-relaxed text-ink-soft">
            Only what the bot and dashboard need to run the clan.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {COLLECT.map((item, i) => (
            <li
              key={item.term}
              className={cn(
                "pond-card flex flex-col gap-2 p-5 sm:p-6",
                "animate-fade-rise",
                "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]",
                i === 0 &&
                  "sm:col-span-2 bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface)),var(--card-surface)_70%)]",
              )}
              style={{ animationDelay: `${100 + i * 35}ms` }}
            >
              <Heading as="h3" className="text-xl sm:text-2xl">
                {item.term}
              </Heading>
              <p className="text-sm leading-relaxed text-ink-soft sm:text-[0.95rem]">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pond-section">
        <div
          className="pond-section-head animate-fade-rise max-w-xl"
          style={{ animationDelay: "120ms" }}
        >
          <Heading as="h2">How it works</Heading>
          <p className="text-base leading-relaxed text-ink-soft">
            Use, sharing, cookies, and how to get your data removed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POLICY_BLOCKS.map((block, i) => (
            <article
              key={block.id}
              id={block.id}
              className={cn(
                "pond-card scroll-mt-24 flex flex-col gap-2 p-5 sm:p-6",
                "animate-fade-rise",
                block.id === "how-we-use" && "sm:col-span-2 lg:col-span-3",
              )}
              style={{ animationDelay: `${140 + i * 30}ms` }}
            >
              <Heading as="h3" className="text-xl sm:text-2xl">
                {block.title}
              </Heading>
              <p className="text-sm leading-relaxed text-ink-soft sm:text-[0.95rem]">
                {block.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="pond-section">
        <article
          className={cn(
            "pond-card relative overflow-hidden p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8",
            "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_68%)]",
            "animate-fade-rise",
          )}
          style={{ animationDelay: "200ms" }}
        >
          <Image
            src="/badges/koi-10.png"
            alt=""
            width={120}
            height={120}
            className="pointer-events-none absolute -right-2 -bottom-3 size-24 opacity-40 drop-shadow-md sm:size-32"
          />
          <div className="relative max-w-lg space-y-2">
            <p className="pond-label">Contact</p>
            <Heading as="h2" className="text-2xl sm:text-3xl">
              Questions about your data?
            </Heading>
            <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
              Reach an officer in the K0ii Discord. We&apos;ll help review or
              remove what we hold.
            </p>
          </div>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "relative mt-5 w-full shrink-0 sm:mt-0 sm:w-auto",
            )}
          >
            Open Discord
          </a>
        </article>
      </section>

      <aside
        className={cn(
          "pond-card animate-fade-rise relative overflow-hidden p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7",
        )}
        style={{ animationDelay: "230ms" }}
      >
        <div className="relative space-y-1.5">
          <p className="font-display text-lg font-semibold text-ink sm:text-xl">
            Also see our terms
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Account linking, acceptable use, and volunteer service limits.
          </p>
        </div>
        <Link
          href="/terms"
          className={cn(
            buttonVariants({ variant: "secondary", size: "default" }),
            "relative mt-4 w-full sm:mt-0 sm:w-auto",
          )}
        >
          Terms of Service
        </Link>
      </aside>
    </div>
  );
}
