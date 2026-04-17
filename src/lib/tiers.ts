export type TierId = "peewee" | "junior" | "minor" | "pro";

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  playerLimit: number; // Infinity for unlimited
  aiReports: boolean;
  aiReportsPerMonth: number; // 0 = none, Infinity = unlimited
  monthly: { priceId: string; amount: number } | null; // null for free
  yearly: { priceId: string; amount: number } | null;
  highlighted?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "peewee",
    name: "4th Line",
    tagline: "Get on the ice. Free forever.",
    playerLimit: 10,
    aiReports: false,
    aiReportsPerMonth: 0,
    monthly: null,
    yearly: null,
  },
  {
    id: "junior",
    name: "3rd Line",
    tagline: "For scouts tracking a small list.",
    playerLimit: 25,
    aiReports: false,
    aiReportsPerMonth: 0,
    monthly: { priceId: "junior_monthly", amount: 9 },
    yearly: { priceId: "junior_yearly", amount: 90 },
  },
  {
    id: "minor",
    name: "2nd Line",
    tagline: "For active regional scouts.",
    playerLimit: 50,
    aiReports: true,
    aiReportsPerMonth: 10,
    monthly: { priceId: "minor_monthly", amount: 19 },
    yearly: { priceId: "minor_yearly", amount: 190 },
    highlighted: true,
  },
  {
    id: "pro",
    name: "1st Line",
    tagline: "Unlimited players + unlimited AI reports.",
    playerLimit: Infinity,
    aiReports: true,
    aiReportsPerMonth: Infinity,
    monthly: { priceId: "pro_monthly", amount: 39 },
    yearly: { priceId: "pro_yearly", amount: 390 },
  },
];

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<TierId, Tier>;

export const FREE_TIER: Tier = TIERS[0];

export function aiReportsLimitLabel(tier: Tier): string {
  if (tier.aiReportsPerMonth === 0) return "Not included";
  if (!isFinite(tier.aiReportsPerMonth)) return "Unlimited";
  return `${tier.aiReportsPerMonth} / month`;
}

// Media capabilities by tier
export interface MediaCapabilities {
  canUploadPhotos: boolean;
  canUploadVideos: boolean;
  canAiAnalyze: boolean;
}

export function mediaCapabilities(tierId: TierId): MediaCapabilities {
  switch (tierId) {
    case "peewee":
    case "junior":
      return { canUploadPhotos: true, canUploadVideos: false, canAiAnalyze: false };
    case "minor":
      return { canUploadPhotos: true, canUploadVideos: true, canAiAnalyze: true };
    case "pro":
      return { canUploadPhotos: true, canUploadVideos: true, canAiAnalyze: true };
  }
}

export const MEDIA_LIMITS = {
  photoMaxBytes: 10 * 1024 * 1024,        // 10 MB
  videoMaxBytes: 100 * 1024 * 1024,       // 100 MB
  videoMaxSeconds: 60,
};

export const SKILL_TAGS = ["Skating", "Shot", "Hands", "IQ", "Compete", "Physicality"] as const;
