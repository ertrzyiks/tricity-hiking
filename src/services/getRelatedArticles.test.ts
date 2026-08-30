import { describe, it, expect } from "vitest";
import { getRelatedArticles } from "./getRelatedArticles";

const articles = [
  { id: "alpha" },
  { id: "bravo" },
  { id: "charlie" },
  { id: "delta" },
  { id: "echo" },
];

describe("getRelatedArticles", () => {
  it("returns the next `count` articles following the current one", () => {
    const related = getRelatedArticles(articles, "alpha", 3);

    expect(related.map((a) => a.id)).toEqual(["bravo", "charlie", "delta"]);
  });

  it("wraps around to the start of the list", () => {
    const related = getRelatedArticles(articles, "delta", 3);

    expect(related.map((a) => a.id)).toEqual(["echo", "alpha", "bravo"]);
  });

  it("never includes the current article", () => {
    for (const article of articles) {
      const related = getRelatedArticles(articles, article.id, 3);
      expect(related.some((a) => a.id === article.id)).toBe(false);
    }
  });

  it("sorts input first, so ordering of the input array does not matter", () => {
    const shuffled = [
      articles[3],
      articles[0],
      articles[4],
      articles[1],
      articles[2],
    ];

    expect(getRelatedArticles(shuffled, "alpha", 3)).toEqual(
      getRelatedArticles(articles, "alpha", 3),
    );
  });

  it("eventually cycles through every other article as the current one advances", () => {
    const seen = new Set<string>();

    let currentId = "alpha";
    for (let i = 0; i < articles.length; i++) {
      const related = getRelatedArticles(articles, currentId, 3);
      related.forEach((a) => seen.add(a.id));
      currentId = related[0].id;
    }

    expect(seen.size).toBe(articles.length);
  });

  it("caps the result at count when there are fewer other articles available", () => {
    const two = [{ id: "alpha" }, { id: "bravo" }];

    expect(getRelatedArticles(two, "alpha", 3).map((a) => a.id)).toEqual([
      "bravo",
    ]);
  });

  it("returns an empty array when there are no other articles", () => {
    const single = [{ id: "alpha" }];

    expect(getRelatedArticles(single, "alpha", 3)).toEqual([]);
  });

  it("returns an empty array when the current article is not found", () => {
    expect(getRelatedArticles(articles, "missing", 3)).toEqual([]);
  });
});
