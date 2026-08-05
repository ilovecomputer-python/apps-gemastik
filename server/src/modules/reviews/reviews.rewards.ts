export const POINTS_PER_REVIEW = 10;
export const POINTS_PER_HELPFUL_VOTE = 2;

export function computeBadge(reviewCount: number, totalHelpful: number) {
  if (reviewCount >= 15 && totalHelpful >= 20) return "Reviewer Terpercaya";
  if (reviewCount >= 5) return "Reviewer Aktif";
  return "Reviewer Pemula";
}
