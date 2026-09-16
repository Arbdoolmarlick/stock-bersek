import type { IndicatorBundle } from "@/lib/indicators";
import type { AnalysisBundle } from "@/lib/stockbrief";

export type DataConfidence = {
  score: number;
  label: "High" | "Medium" | "Low";
  reasons: string[];
  ageSeconds: number | null;
};

export function computeDataConfidence(
  bundle: AnalysisBundle,
  indicators: IndicatorBundle | null,
  now = Date.now(),
): DataConfidence {
  const unavailable = bundle.sources.filter((source) => source.status === "unavailable");
  const age = Number(bundle.market.ts);
  const ageSeconds = Number.isFinite(age) ? Math.max(0, Math.round((now - age) / 1000)) : null;
  let score = 40 + (bundle.sources.length - unavailable.length) * 10;

  if (bundle.klines.length >= 20) score += 12;
  if (indicators?.book) score += 10;
  if (bundle.trades.length >= 20) score += 8;
  if (ageSeconds !== null && ageSeconds <= 60) score += 10;
  score = Math.min(score, 100);

  const reasons: string[] = [];
  if (unavailable.length > 0)
    reasons.push(
      `${unavailable.length} source${unavailable.length === 1 ? " is" : "s are"} unavailable`,
    );
  if (bundle.klines.length < 20) reasons.push("limited price history");
  if (!indicators?.book) reasons.push("no usable order book");
  if (bundle.trades.length < 20) reasons.push("limited recent trade flow");
  if (ageSeconds !== null && ageSeconds > 60) reasons.push("quote is over one minute old");
  if (ageSeconds === null) reasons.push("quote freshness is unknown");
  if (reasons.length === 0) reasons.push("all tracked sources are current and available");

  return {
    score,
    label: score >= 85 ? "High" : score >= 60 ? "Medium" : "Low",
    reasons,
    ageSeconds,
  };
}
