import { describe, it, expect } from "vitest";
import { firstTwoSentences } from "./firstTwoSentences";

describe("firstTwoSentences", () => {
  it("returns both sentences when there are two or more", () => {
    expect(
      firstTwoSentences(
        "Discover the Dolina Elfów walking route. It starts at Przymorze-Uniwersytet station. It ends near the Olivia Business Centre.",
      ),
    ).toBe(
      "Discover the Dolina Elfów walking route. It starts at Przymorze-Uniwersytet station.",
    );
  });

  it("returns the whole text unchanged when it has only one sentence", () => {
    expect(firstTwoSentences("Bażantarnia Parasol")).toBe(
      "Bażantarnia Parasol",
    );
  });

  it("returns the whole text unchanged when it has exactly one sentence with a period", () => {
    expect(firstTwoSentences("Park kolibki.")).toBe("Park kolibki.");
  });

  it("does not split on decimal numbers", () => {
    expect(firstTwoSentences("The loop is 4.5km long and mostly flat.")).toBe(
      "The loop is 4.5km long and mostly flat.",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(firstTwoSentences("  A short blurb.  ")).toBe("A short blurb.");
  });

  it("returns an empty string for empty input", () => {
    expect(firstTwoSentences("")).toBe("");
  });
});
