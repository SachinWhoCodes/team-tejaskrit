function matchScoreClass(score: number) {
  if (score >= 80) return "match-score-high";
  if (score >= 60) return "match-score-medium";
  return "match-score-low";
}

export function MatchScore({ score, size = "default" }: { score: number; size?: "default" | "lg" }) {
  const s = Number.isFinite(score) ? Math.round(score) : 0;
  return (
    <span className={`${matchScoreClass(s)} ${size === "lg" ? "text-base min-w-[3rem] h-10 px-3" : ""}`}>
      {s}%
    </span>
  );
}
