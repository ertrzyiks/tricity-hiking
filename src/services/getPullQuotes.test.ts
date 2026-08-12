import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { getPullQuotes } from "./getPullQuotes";

const readRouteBody = (path: string): string => {
  const raw = readFileSync(
    fileURLToPath(new URL(path, import.meta.url)),
    "utf8",
  );
  return raw.replace(/^---[\s\S]*?---/, "");
};

describe("getPullQuotes", () => {
  it("skips the first section and pulls the first sentence from the second section", () => {
    const body = `
## Starting point

The route starts at the station. You can get there by train.

## Olivia

One thing that catches the eye is the _Olivia Star_, the highest building in Gdańsk. If you fancy a nice view.
`;

    const result = getPullQuotes(body);

    expect(result).toEqual([
      null,
      {
        sectionIndex: 1,
        sectionTitle: "Olivia",
        quote:
          "One thing that catches the eye is the Olivia Star, the highest building in Gdańsk.",
      },
    ]);
  });

  it("returns null for a selected section that has no paragraph text", () => {
    const body = `
## Starting point

The route starts at the station.

## Elves Valley

## Going back

Back to the start.
`;

    const result = getPullQuotes(body);

    expect(result).toEqual([null, null, null]);
  });

  it("applies a manual override to the first selected section instead of the heuristic", () => {
    const body = `
## Starting point

The route starts at the station.

## Olivia

One thing that catches the eye is the Olivia Star.
`;

    const result = getPullQuotes(body, ["A hand-picked pull quote."]);

    expect(result).toEqual([
      null,
      {
        sectionIndex: 1,
        sectionTitle: "Olivia",
        quote: "A hand-picked pull quote.",
      },
    ]);
  });

  it("reproduces the worked example from the resolved spec against the real Dolina Elfów content", () => {
    const body = readRouteBody(
      "../content/routes/dolina-elfow/dolina-elfow.mdx",
    );

    const result = getPullQuotes(body);

    expect(result[1]).toEqual({
      sectionIndex: 1,
      sectionTitle: "Olivia",
      quote:
        "One thing that catches the eye is the Olivia Star, the highest building in Gdańsk.",
    });
  });
});
