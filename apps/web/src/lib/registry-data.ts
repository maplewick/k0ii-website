/** Staff directory — ported from legacy `web/src/lib/registry-data.ts`. */

export type RegistryPerson = {
  robloxId: number;
  username: string;
  displayName: string;
  role: string;
  roleColor: string;
  bio?: string;
  personalBio?: string;
};

export const REGISTRY_EXCLUDED_IDS = new Set([
  "5720557910",
  "7568181757",
  "8084241514",
  "5788841490",
  "8211764159",
  "8211790368",
  "5754518062",
  "6075729799",
  "6075734864",
  "6075738198",
  "5759861730",
  "4516747073",
  "7317021396",
]);

export const REGISTRY_LEADERS: RegistryPerson[] = [
  {
    robloxId: 20730159,
    username: "oriboriiii",
    displayName: "ori",
    role: "In-Game Clan Leader",
    roleColor: "#ff8f3d",
    bio: "oriboriiii has been staff with K0ii since October of 2024 and has been a directive front runner for over a dozen top placements over almost 2 years. They have remained with K0ii through various gamestates, as well as directing K0i2 during the K0ii & K0i2 simultaneous top 10 finishes. They have unofficially owned K0ii since Zykzo's retirement in 2025, and welcome him back for the summer of 2026 as co-owners. They love their wife very much.",
    personalBio: "the k0iiri of all time",
  },
  {
    robloxId: 279010107,
    username: "Zykzo",
    displayName: "Zykzo",
    role: "Co-Clan Owner",
    roleColor: "#a78bfa",
    bio: "Zykzo was K0ii's Clan Owner between 2024-2025 in which K0ii placed top 3 multiple times, retiring at the end of 2025 to focus on his college studies. However, he now returns as clan co-owner for the summer alongside ori. He is also one of the developers of the website and bot.",
    personalBio: "Nuclear Engineer @ UW-Madison, Incoming Graduate Student @ Georgia Tech",
  },
];

export const REGISTRY_COMMUNIDARS: RegistryPerson[] = [
  {
    robloxId: 1522057458,
    username: "WitheredZack",
    displayName: "Vietnam_Zack",
    role: "Communidar",
    roleColor: "#38bdf8",
    personalBio: "Hi I'm Zack and I play pet game",
  },
];

export const REGISTRY_DEVELOPERS: RegistryPerson[] = [
  {
    robloxId: 111289122,
    username: "Andrew1644563",
    displayName: "Andrew",
    role: "Developer",
    roleColor: "#8b5cf6",
    personalBio:
      "Avid coder and loves all things computer related, probably made any macros in the clan",
  },
];

export const REGISTRY_OFFICERS: RegistryPerson[] = [
  {
    robloxId: 1207553509,
    username: "dragoxx192",
    displayName: "Nagi",
    role: "Clan Officer",
    roleColor: "#fb7185",
    personalBio: "larping yaoi lover",
  },
  {
    robloxId: 49526463,
    username: "owoAriaa",
    displayName: "Aria",
    role: "Clan Officer",
    roleColor: "#fb7185",
    personalBio: "ori's wife",
  },
  {
    robloxId: 619312547,
    username: "rodeohead",
    displayName: "FroggieDuckie",
    role: "Clan Officer",
    roleColor: "#fb7185",
  },
  {
    robloxId: 484051839,
    username: "sebvo091",
    displayName: "Severrex",
    role: "Clan Officer",
    roleColor: "#fb7185",
  },
];

export const REGISTRY_FOUNDERS: RegistryPerson[] = [
  {
    robloxId: 1324701528,
    username: "God_7668",
    displayName: "God_7668",
    role: "Founder",
    roleColor: "#34d399",
  },
  {
    robloxId: 517312871,
    username: "WokiePoki",
    displayName: "WokiePoki",
    role: "Founder",
    roleColor: "#34d399",
    personalBio:
      "Location: Denmark\nBy day: police officer\nBy night: DJ\nAlways: Gamer\nFamily Person\nClan: Started in LEGO, ended in K0ii.\nQuestions?: Ask Dan",
  },
  {
    robloxId: 1260752023,
    username: "Jemmness",
    displayName: "Jemm",
    role: "Founder",
    roleColor: "#34d399",
  },
];

export const REGISTRY_SECTIONS = [
  { title: "Leadership", people: REGISTRY_LEADERS },
  { title: "Communidars", people: REGISTRY_COMMUNIDARS },
  { title: "Developers", people: REGISTRY_DEVELOPERS },
  { title: "Officers", people: REGISTRY_OFFICERS },
  { title: "Founders", people: REGISTRY_FOUNDERS },
] as const;

export const SECTION_BLURBS: Record<string, string> = {
  Leadership: "Co-owners steering wars, culture, and the long game.",
  Communidars: "Community voice: Discord pulse and member care.",
  Developers: "Bots, macros, and the dashboard under the lily pads.",
  Officers: "Day-to-day ops: roster moves, war calls, and keep-up.",
  Founders: "The people who started the pond.",
  Members: "Everyone else currently on the live K0ii roster.",
};

export function allStaffRobloxIds(): string[] {
  return REGISTRY_SECTIONS.flatMap((s) =>
    s.people.map((p) => String(p.robloxId)),
  );
}
