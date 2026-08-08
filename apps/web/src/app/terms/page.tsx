import Image from "next/image";
import Link from "next/link";

import { DISCORD_URL } from "@/components/layout/nav-config";
import { Heading } from "@/components/layout/heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * THESIS: Terms as pond bento twin of privacy - join/rewards energy, not a PDF.
 * OWN-WORLD: Koi wash hero, Fredoka heads, cream cards, teal contact strip.
 * STORY: Accept → rules → limits → contact + privacy.
 * FIRST VIEWPORT: Title + lede + featured Acceptance card.
 * FORM: Match privacy layout, web/terms copy.
 */

const RULES = [
  {
    title: "No impersonation",
    body: "Don't impersonate another member, officer, or Roblox/Discord account.",
  },
  {
    title: "No abuse",
    body: "Don't attempt to abuse, exploit, or overload the bot or website.",
  },
  {
    title: "Platform terms first",
    body: "Follow Discord's and Roblox's own Terms of Service at all times. These terms don't override them.",
  },
] as const;

const TERM_BLOCKS = [
  {
    id: "what-k0ii-is",
    title: "What K0ii is",
    body: "K0ii is an unofficial, community-run Discord bot and companion website for a Pet Simulator 99 clan. It is not affiliated with Roblox Corporation, Big Games, or Discord Inc. It is provided by volunteer clan members, not a company.",
  },
  {
    id: "account-linking",
    title: "Account linking",
    body: "Some features require your Discord account to be linked to a Roblox account via Bloxlink or manually by an officer. Roster display, profile customization, and donation tracking depend on this link.",
  },
  {
    id: "profile-content",
    title: "Profile customization content",
    body: "Customization content must not be illegal, offensive, harassing, or infringe on someone else's rights. Officers may remove or reset any customization at their discretion.",
  },
  {
    id: "no-warranty",
    title: "No warranty",
    body: 'K0ii is provided "as is," run by volunteers in their spare time. We don\'t guarantee uptime, accuracy of displayed statistics, or uninterrupted service.',
  },
  {
    id: "changes",
    title: "Changes",
    body: "We may change, suspend, or discontinue any part of the bot or website at any time. Continued use after a terms update means you accept the update.",
  },
  {
    id: "termination",
    title: "Termination",
    body: "Clan officers may remove your roles, revoke access, or reset customization at their discretion, consistent with clan rules and Discord's Terms of Service.",
  },
] as const;

export default function TermsPage() {
  return (
    <div className="pond-page">
      <header className="animate-fade-rise pond-section-head space-y-3">
        <Heading as="h1">
          Terms of <span className="text-koi">Service</span>
        </Heading>
        <p className="pond-lede">
          Ground rules for the K0ii Discord bot, website, and Roblox-linked
          profile features.
        </p>
      </header>

      <section className="pond-section">
        <article
          id="acceptance"
          className={cn(
            "pond-card relative scroll-mt-24 overflow-hidden p-6 sm:p-8 lg:p-10",
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
            <p className="pond-label">Volunteer-run</p>
            <Heading as="h2" className="text-3xl sm:text-4xl">
              Acceptance
            </Heading>
            <p className="text-base leading-relaxed text-ink sm:text-lg">
              By using the K0ii Discord bot, the k0ii.com website, or logging in
              with your Roblox account, you agree to these terms. If you
              don&apos;t agree, don&apos;t use these services.
            </p>
          </div>
        </article>
      </section>

      <section className="pond-section">
        <div
          className="pond-section-head animate-fade-rise max-w-xl"
          style={{ animationDelay: "80ms" }}
        >
          <Heading as="h2">Acceptable use</Heading>
          <p className="text-base leading-relaxed text-ink-soft">
            Keep the pond fun. Break these and officers step in.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {RULES.map((rule, i) => (
            <li
              key={rule.title}
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
                {rule.title}
              </Heading>
              <p className="text-sm leading-relaxed text-ink-soft sm:text-[0.95rem]">
                {rule.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pond-section">
        <div
          className="pond-section-head animate-fade-rise max-w-xl"
          style={{ animationDelay: "160ms" }}
        >
          <Heading as="h2">How it works</Heading>
          <p className="text-base leading-relaxed text-ink-soft">
            What K0ii is, linking, profiles, warranties, and when access ends.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TERM_BLOCKS.map((block, i) => (
            <article
              key={block.id}
              id={block.id}
              className={cn(
                "pond-card scroll-mt-24 flex flex-col gap-2 p-5 sm:p-6",
                "animate-fade-rise",
                block.id === "what-k0ii-is" && "sm:col-span-2 lg:col-span-3",
              )}
              style={{ animationDelay: `${180 + i * 30}ms` }}
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
          id="contact"
          className={cn(
            "pond-card relative scroll-mt-24 overflow-hidden p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8",
            "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_68%)]",
            "animate-fade-rise",
          )}
          style={{ animationDelay: "220ms" }}
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
              Questions about these terms?
            </Heading>
            <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
              Reach an officer in the K0ii Discord. We&apos;ll clarify how clan
              rules apply.
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
        style={{ animationDelay: "250ms" }}
      >
        <div className="relative space-y-1.5">
          <p className="font-display text-lg font-semibold text-ink sm:text-xl">
            Also see our privacy policy
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            What we collect, how we use it, and how to request removal.
          </p>
        </div>
        <Link
          href="/privacy"
          className={cn(
            buttonVariants({ variant: "secondary", size: "default" }),
            "relative mt-4 w-full sm:mt-0 sm:w-auto",
          )}
        >
          Privacy Policy
        </Link>
      </aside>
    </div>
  );
}
