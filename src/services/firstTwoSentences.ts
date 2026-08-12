// Splits on a period/!/? that is followed by whitespace (or the end of the
// string), so decimal numbers like "4.5km" don't get treated as a sentence
// boundary.
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=\S)/;

/**
 * Kiosk visitors skim rather than read a full MDX body, so route summaries
 * are cut down to their first two sentences.
 */
export function firstTwoSentences(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const sentences = trimmed.split(SENTENCE_BOUNDARY);

  return sentences.slice(0, 2).join(" ");
}
