export type TierId = "peewee" | "junior" | "minor" | "pro";

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  playerLimit: number; // Infinity for unlimited
  aiReports: boolean;
  monthly: { priceId: string; amount: number } | null; // null for free
  yearly: { priceId: string; amount: number } | null;
  highlighted?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "peewee",
    name: "PeeWee",
    tagline: "Get on the ice. Free forever.",
    playerLimit: 10,
    aiReports: false,
    monthly: null,
    yearly: null,
  },
  {
    id: "junior",
    name: "Junior",
    tagline: "For scouts tracking a small list.",
    playerLimit: 25,
    aiReports: false,
    monthly: { priceId: "junior_monthly", amount: 9 },
    yearly: { priceId: "junior_yearly", amount: 90 },
  },
  {
    id: "minor",
    name: "Minor",
    tagline: "For active regional scouts.",
    playerLimit: 50,
    aiReports: false,
    monthly: { priceId: "minor_monthly", amount: 19 },
    yearly: { priceId: "minor_yearly", amount: 190 },
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlimited players + AI scouting reports.",
    playerLimit: Infinity,
    aiReports: true,
    monthly: { priceId: "pro_monthly", amount: 39 },
    yearly: { priceId: "pro_yearly", amount: 390 },
  },
];

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<TierId, Tier>;

export const FREE_TIER: Tier = TIERS[0];
