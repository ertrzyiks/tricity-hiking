export type DeckKey = "tricity" | "nearby";

export type SwipeAction = "next" | "prev" | "open" | null;

/**
 * Keeps an index within the bounds of a deck of the given length.
 * A zero-length deck always resolves to index 0.
 */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

/**
 * Finds which deck (and index within it) a card with the given slug lives
 * in. Used to restore a shared/bookmarked `?route=<slug>` URL to the right
 * deck + card on load, without the caller needing to know deck membership.
 */
export function locateCardBySlug(
  decks: Record<DeckKey, { slug: string }[]>,
  slug: string | null,
): { deckKey: DeckKey; index: number } | null {
  if (!slug) {
    return null;
  }

  for (const deckKey of Object.keys(decks) as DeckKey[]) {
    const index = decks[deckKey].findIndex((card) => card.slug === slug);

    if (index !== -1) {
      return { deckKey, index };
    }
  }

  return null;
}

/**
 * Turns a pointer drag delta into a deck action. The dominant axis wins:
 * a mostly-horizontal drag pages the deck, a mostly-vertical upward drag
 * opens the route detail page. Movement below the threshold is treated as
 * a tap/no-op rather than a swipe.
 */
export function resolveSwipeAction(
  deltaX: number,
  deltaY: number,
  threshold: number,
): SwipeAction {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < threshold && absY < threshold) {
    return null;
  }

  if (absY > absX) {
    return deltaY < 0 ? "open" : null;
  }

  return deltaX < 0 ? "next" : "prev";
}
