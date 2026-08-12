import { describe, it, expect } from "vitest";
import { createEditorialMarkdownComponents } from "./createEditorialMarkdownComponents";
import { PullQuote } from "./PullQuote";

describe("createEditorialMarkdownComponents", () => {
  it("still resolves the right pull quote when the same headings are rendered a second time (Astro renders MDX content more than once per page)", () => {
    const pullQuotes = [
      null,
      { sectionIndex: 1, sectionTitle: "Olivia", quote: "Quote text" },
    ];
    const { h2: Heading2 } = createEditorialMarkdownComponents(pullQuotes);

    const renderBothHeadings = () => [
      Heading2({ id: "starting-point", children: "Starting point" }),
      Heading2({ id: "olivia", children: "Olivia" }),
    ];

    // First pass over the headings, e.g. Astro collecting `headings` metadata.
    renderBothHeadings();
    // Second pass: the actual page render, same ids in the same order.
    const [firstHeading, secondHeading] = renderBothHeadings();

    const hasPullQuote = (vnode: any) =>
      ([] as any[])
        .concat(vnode.props.children)
        .some((child) => child && child.type === PullQuote);

    expect(hasPullQuote(firstHeading)).toBe(false);
    expect(hasPullQuote(secondHeading)).toBe(true);
  });
});
