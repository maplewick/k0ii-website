import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/**
 * Parts of k0ii.com are still served by the Discord bot, which this rewrite does
 * not reimplement: the self-service profile editor, the officer dashboard, the
 * OG share cards Discord unfurls, and avatar decoration media.
 *
 * They are proxied rather than linked out because the bot's login cookie is
 * `secure` + `sameSite=lax` — it only survives if the browser sees one origin.
 * Point BOT_UPSTREAM_URL at the bot service; leave it unset and these paths
 * simply 404 as they do today.
 */
const botUpstream = process.env.BOT_UPSTREAM_URL?.replace(/\/$/, "");

function botRewrites() {
  if (!botUpstream) return { beforeFiles: [], afterFiles: [] };

  return {
    // Must beat the `/api/[...path]` catch-all, which forwards to the stats API.
    // Profile and officer data still come from the bot, so they are matched
    // before the filesystem route gets a chance to claim them.
    beforeFiles: [
      {
        source: "/api/profile/:path*",
        destination: `${botUpstream}/api/profile/:path*`,
      },
      {
        source: "/api/officer/:path*",
        destination: `${botUpstream}/api/officer/:path*`,
      },
      // Per-member customisation (avatar frames, decorations, colours, medals)
      // lives only in the bot. `/api/members` already belongs to the stats API,
      // so the bot's roster is exposed under its own name.
      {
        source: "/api/bot-members",
        destination: `${botUpstream}/api/members`,
      },
    ],
    afterFiles: [
      // Fetched with the trailing slash the bot's static middleware wants, so it
      // answers 200 instead of 301-ing to `/profile/` — which Next would bounce
      // straight back to `/profile`, looping forever. The browser URL stays
      // slashless, so those pages must reference their assets by absolute path.
      { source: "/profile", destination: `${botUpstream}/profile/` },
      { source: "/profile/:path*", destination: `${botUpstream}/profile/:path*` },
      { source: "/officer", destination: `${botUpstream}/officer/` },
      { source: "/officer/:path*", destination: `${botUpstream}/officer/:path*` },
      // The one-time login links the bot's /profile command hands out.
      { source: "/auth/:path*", destination: `${botUpstream}/auth/:path*` },
      { source: "/card/:path*", destination: `${botUpstream}/card/:path*` },
      { source: "/media/:path*", destination: `${botUpstream}/media/:path*` },
      // Those two pages pull shared CSS and JS from /lib.
      { source: "/lib/:path*", destination: `${botUpstream}/lib/:path*` },
    ],
  };
}

const nextConfig: NextConfig = {
  transpilePackages: ["@k0ii/schemas"],
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ps99.biggamesapi.io" },
      { protocol: "https", hostname: "tr.rbxcdn.com" },
      { protocol: "https", hostname: "thumbnails.roblox.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/race", destination: "/roster?view=race", permanent: false },
      {
        source: "/leaderboards",
        destination: "/roster?view=clans",
        permanent: false,
      },
      {
        source: "/graphs",
        destination: "/roster?view=charts",
        permanent: false,
      },
      {
        source: "/coverage",
        destination: "/roster?view=charts",
        permanent: false,
      },
      {
        source: "/reports",
        destination: "/history?view=report",
        permanent: false,
      },
      {
        source: "/replay",
        destination: "/history?view=replay",
        permanent: false,
      },
      {
        source: "/join",
        destination: "/community?view=join",
        permanent: false,
      },
      {
        source: "/registry",
        destination: "/community?view=registry",
        permanent: false,
      },
      {
        source: "/altpoints",
        destination: "/roster?view=members",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const { beforeFiles, afterFiles } = botRewrites();
    return { beforeFiles, afterFiles, fallback: [] };
  },
};

export default nextConfig;
