export interface PullQuote {
  sectionIndex: number;
  sectionTitle: string;
  quote: string;
}

const stripMarkdownEmphasis = (text: string): string =>
  text
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

const firstSentence = (paragraph: string): string | null => {
  const clean = stripMarkdownEmphasis(paragraph.replace(/\s+/g, " ").trim());

  if (!clean) {
    return null;
  }

  const match = clean.match(/^.*?[.!?](?=\s|$)/);

  return match ? match[0].trim() : clean;
};

interface Section {
  title: string;
  paragraph: string;
}

const parseSections = (body: string): Section[] => {
  const lines = body.split("\n");
  const sections: Section[] = [];

  let currentTitle: string | null = null;
  let currentParagraphLines: string[] = [];
  let capturedFirstParagraph = false;

  const flush = () => {
    if (currentTitle !== null) {
      sections.push({
        title: currentTitle,
        paragraph: currentParagraphLines.join(" "),
      });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);

    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
      currentParagraphLines = [];
      capturedFirstParagraph = false;
      continue;
    }

    if (currentTitle === null) {
      continue;
    }

    if (capturedFirstParagraph) {
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === "") {
      if (currentParagraphLines.length > 0) {
        capturedFirstParagraph = true;
      }
      continue;
    }

    currentParagraphLines.push(trimmed);
  }

  flush();

  return sections;
};

/**
 * Picks a pull-quote for every 2nd `##` section (0-indexed: 1, 3, 5, ...) by
 * taking the first sentence of that section's opening paragraph. Sections
 * that aren't selected, or that have no usable opening sentence, map to
 * `null` so the result stays index-aligned with the MDX section order.
 *
 * `overrides` lets a route author replace the heuristic per selected
 * section (in selection order) via a `pullQuotes` frontmatter field.
 */
export function getPullQuotes(
  body: string,
  overrides?: string[],
): (PullQuote | null)[] {
  const sections = parseSections(body);

  return sections.map((section, index) => {
    if (index % 2 !== 1) {
      return null;
    }

    const overrideIndex = (index - 1) / 2;
    const override = overrides?.[overrideIndex];

    if (override) {
      return {
        sectionIndex: index,
        sectionTitle: section.title,
        quote: override,
      };
    }

    const quote = firstSentence(section.paragraph);

    if (!quote) {
      return null;
    }

    return { sectionIndex: index, sectionTitle: section.title, quote };
  });
}
