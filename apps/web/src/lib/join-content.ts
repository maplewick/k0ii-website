/** Join page copy — ported from legacy `web/src/app/join/page.tsx` + k0ii.com/join. */

export const JOIN_WHY = [
  {
    title: "Clan Bank",
    desc: "Access a fully transparent clan bank funded by members. Need gems for boosts or upgrades? Send in a funding request and you will never be left behind in a battle.",
  },
  {
    title: "Advanced Tools",
    desc: "K0ii runs a fully automated tracking system: live point tracking every 5 minutes, custom bots, in-house macro makers, alt setups, and remote tooling, plus this dashboard.",
  },
  {
    title: "Alt Clan",
    desc: "K0ii runs a max-rank alternative clan for alt accounts. Get full clan benefits including diamond bonuses and AFK grinding perks on your alts.",
  },
  {
    title: "Global Player Search",
    desc: "Members get /globalsearch: look up any player and see clan, stars, global rank, percentile, and points over time. We index the top 500 clans ourselves.",
  },
] as const;

export const JOIN_MUST = [
  "Rank 30+",
  "99+ Huges (15+ RB or Shiny for events)",
  "AFK 24/7",
  "PC Players Only",
  "Can run Macros (TinyTask, AHK, etc.)",
  "Run alts if necessary",
  "Fund your own teams / boosts in battles",
  "Gamepasses: Super Drops, +15 Hatch, +15 Pets, Lucky, Ultra Lucky, Magic Eggs, VIP+, etc.",
  "All enchant slots (incl. Robux)",
  "Enchants: Super Magnet, Corruption, Chest Breakers",
  "Active in Discord, respond to polls / pings",
  "Understand English",
  "Good clan history (90%+ contribution, if applicable)",
] as const;

export const JOIN_NICE = [
  "Good alts",
  "Remote tools",
  "Proof of activity",
  "Rainbow Egg Enchant",
  "Shiny Hoverboard",
] as const;

export const JOIN_STEPS = [
  {
    title: "Join our Discord",
    desc: "Head to our Discord server and find the recruit-apply channel.",
  },
  {
    title: "Verify with Bloxlink",
    desc: "Link your Roblox account so we can pull your stats automatically.",
  },
  {
    title: "Officer Review",
    desc: "An officer will review your profile and current clan stats, then reach out.",
  },
  {
    title: "Placement Period",
    desc: "Once accepted, you wait for a spot to open, typically at the end of a clan battle.",
  },
] as const;

export const CAREER_BADGES = [
  { image: "/badges/koi-1.png", name: "Regular Koi Fish", battles: 1 },
  { image: "/badges/koi-2.png", name: "Huge Koi Fish", battles: 2 },
  { image: "/badges/koi-3.png", name: "Gold Huge Koi Fish", battles: 3 },
  { image: "/badges/koi-4.png", name: "Rainbow Huge Koi Fish", battles: 4 },
  { image: "/badges/koi-5.png", name: "Shiny Huge Koi Fish", battles: 5 },
  { image: "/badges/koi-6.png", name: "Gold Shiny Huge Koi Fish", battles: 6 },
  { image: "/badges/koi-7.png", name: "Rainbow Shiny Huge Koi Fish", battles: 7 },
  { image: "/badges/koi-8.png", name: "Titanic Koi Fish", battles: 8 },
  { image: "/badges/koi-9.png", name: "Shiny Titanic Koi Fish", battles: 9 },
  { image: "/badges/koi-10.png", name: "Rainbow Titanic Koi Fish", battles: 10 },
] as const;
