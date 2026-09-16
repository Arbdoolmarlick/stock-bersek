export function quoteFreshness(ageSeconds: number | null) {
  if (ageSeconds === null) return "freshness unknown";
  if (ageSeconds < 60) return `updated ${ageSeconds}s ago`;
  return `updated ${Math.floor(ageSeconds / 60)}m ago`;
}

export function hasThinLiquidity({
  hasOrderBook,
  spreadPct,
  turnover24h,
}: {
  hasOrderBook: boolean;
  spreadPct: number | undefined;
  turnover24h: string;
}) {
  const turnover = Number(turnover24h);
  return (
    !hasOrderBook ||
    (spreadPct !== undefined && spreadPct > 0.5) ||
    (Number.isFinite(turnover) && turnover < 10_000)
  );
}
