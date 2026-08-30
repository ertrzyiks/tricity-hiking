interface Identifiable {
  id: string;
}

/**
 * Picks the next `count` articles that follow `currentId` in a stable,
 * alphabetically sorted ring of all articles.
 *
 * Using a fixed ring (rather than e.g. "most recent" or "random") means
 * every article points forward to a different trio of neighbours, so
 * following the "Continue reading" links from any single article will
 * eventually cycle through every article in the collection instead of
 * always looping back to the same handful.
 */
export function getRelatedArticles<T extends Identifiable>(
  allArticles: T[],
  currentId: string,
  count = 3,
): T[] {
  const sorted = [...allArticles].sort((a, b) => a.id.localeCompare(b.id));
  const currentIndex = sorted.findIndex((article) => article.id === currentId);

  if (currentIndex === -1 || sorted.length <= 1) {
    return [];
  }

  const take = Math.min(count, sorted.length - 1);
  const related: T[] = [];

  for (let offset = 1; offset <= take; offset++) {
    const index = (currentIndex + offset) % sorted.length;
    related.push(sorted[index]);
  }

  return related;
}
