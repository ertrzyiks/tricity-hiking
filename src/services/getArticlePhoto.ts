import type { ImageMetadata } from "astro";
import wielkaGwiazda from "../assets/photos/wielka-gwiazda.jpg";
import lysaGora from "../assets/photos/lysa-gora.jpg";

/**
 * Picks the cover photo for an article by id.
 *
 * Kept as a single lookup so the article list and the "Continue reading"
 * recommendations always show the same photo for a given article.
 */
export function getArticlePhoto(id: string): ImageMetadata {
  return id === "the-best-hiking-trails-near-gdansk" ? wielkaGwiazda : lysaGora;
}
