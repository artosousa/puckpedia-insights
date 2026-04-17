// Heuristic "Scout Confidence" derived from the actual evidence we have on a player.
// Inputs: number of viewings, number of AI-analyzed clips, and consistency of the
// per-metric ratings across all sources. More evidence + more agreement => higher confidence.

export type ScoutConfidence = "low" | "medium" | "high";

interface MetricSeries {
  skating: (number | null)[];
  shot: (number | null)[];
  hands: (number | null)[];
  iq: (number | null)[];
  compete: (number | null)[];
  physicality: (number | null)[];
}

const stddev = (vals: number[]): number => {
  if (vals.length < 2) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const v = vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length;
  return Math.sqrt(v);
};

export interface ConfidenceInputs {
  viewingsCount: number;
  aiClipsCount: number;
  metrics: MetricSeries;
}

export interface ConfidenceResult {
  level: ScoutConfidence;
  score: number; // 0..100
  reason: string;
}

export function computeScoutConfidence(input: ConfidenceInputs): ConfidenceResult {
  const { viewingsCount, aiClipsCount, metrics } = input;
  const evidence = viewingsCount + aiClipsCount;

  if (evidence === 0) {
    return { level: "low", score: 0, reason: "No viewings or analyzed clips yet." };
  }

  // Evidence score: scales 0..60. Saturates around ~6 total touchpoints.
  const evidenceScore = Math.min(60, Math.round((evidence / 6) * 60));

  // Consistency score: average per-metric stddev across the 6 metrics, inverted.
  // stddev of 0 => perfect agreement => +40; stddev >= 2.5 => 0.
  const stds: number[] = [];
  (Object.keys(metrics) as (keyof MetricSeries)[]).forEach((k) => {
    const arr = metrics[k].filter((n): n is number => n != null);
    if (arr.length >= 2) stds.push(stddev(arr));
  });
  const avgStd = stds.length ? stds.reduce((a, b) => a + b, 0) / stds.length : 0;
  const consistencyScore =
    stds.length === 0
      ? 15 // neutral when we can't measure agreement (single data point)
      : Math.max(0, Math.round(40 * (1 - Math.min(avgStd, 2.5) / 2.5)));

  const score = evidenceScore + consistencyScore;
  const level: ScoutConfidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  const parts: string[] = [];
  parts.push(
    `${viewingsCount} viewing${viewingsCount === 1 ? "" : "s"} + ${aiClipsCount} AI clip${aiClipsCount === 1 ? "" : "s"}`
  );
  if (stds.length === 0) {
    parts.push("not enough data to measure rating consistency");
  } else if (avgStd < 0.7) {
    parts.push("ratings are highly consistent");
  } else if (avgStd < 1.3) {
    parts.push("ratings are reasonably consistent");
  } else {
    parts.push("ratings vary a lot between sources");
  }
  return { level, score, reason: parts.join(" · ") };
}
