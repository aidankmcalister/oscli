export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => {
      if (i === 0) return j;
      if (j === 0) return i;
      return 0;
    }),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[a.length][b.length];
}

export function suggest(input: string, candidates: string[]): string | null {
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((candidate) => ({
      candidate,
      distance: levenshtein(input, candidate),
    }))
    .sort((a, b) => a.distance - b.distance);

  return scored[0] && scored[0].distance <= 3 ? scored[0].candidate : null;
}
