import type { ComponentChildren, FunctionComponent } from "preact";
import { config } from "./index";
import { Heading2Editorial } from "./Heading2Editorial";
import { PullQuote } from "./PullQuote";
import type { PullQuote as PullQuoteData } from "../../services/getPullQuotes";

interface HeadingProps {
  id?: string;
  children: ComponentChildren;
}

/**
 * Builds a per-page MDX component override map for the magazine/editorial
 * route detail template: same base config as everywhere else (paragraphs,
 * links, lists, emphasis), plus a serif h2 and, breaking the text column
 * right after it, the pre-computed pull-quote for that section (if any).
 *
 * Astro renders `<Content>` more than once per page (at least once to
 * collect `headings` metadata, once to produce the actual HTML), calling
 * this h2 override each time with the *same* sequence of heading `id`s. A
 * plain call-order counter would double-count and run off the end of
 * `pullQuotes` on the second pass, so instead each `id` is mapped to a
 * section index the first time it's seen and reused on every later call -
 * stable across any number of render passes, in whatever order Astro
 * chooses to run them.
 */
export function createEditorialMarkdownComponents(
  pullQuotes: ReadonlyArray<PullQuoteData | null>,
) {
  const sectionIndexById = new Map<string, number>();
  let nextIndex = 0;

  const Heading2WithPullQuote: FunctionComponent<HeadingProps> = ({
    id,
    children,
  }) => {
    let index = id === undefined ? undefined : sectionIndexById.get(id);

    if (index === undefined) {
      index = nextIndex;
      nextIndex += 1;
      if (id !== undefined) {
        sectionIndexById.set(id, index);
      }
    }

    const pullQuote = pullQuotes[index];

    return (
      <>
        <Heading2Editorial>{children}</Heading2Editorial>
        {pullQuote && <PullQuote quote={pullQuote.quote} />}
      </>
    );
  };

  return {
    ...config,
    h2: Heading2WithPullQuote,
  };
}
