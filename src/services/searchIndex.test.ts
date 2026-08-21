import { describe, expect, it } from "vitest";
import { groupSearchResults, type SearchItem } from "./searchIndex";

const items: SearchItem[] = [
  {
    type: "route",
    title: "Dolina Strzyży",
    description: "A forest valley walk close to Gdańsk city centre.",
    distance: "5.60 km",
    href: "/routes/dolina-strzyzy/",
  },
  {
    type: "route",
    title: "Wąwóz Huzarów",
    description: "A short ravine trail.",
    distance: "3.10 km",
    href: "/routes/wawoz-huzarow/",
  },
  {
    type: "route",
    title: "Sobieszewo",
    description: "Coastal forest and dunes on the island.",
    distance: "12.00 km",
    href: "/routes/sobieszewo/",
  },
  {
    type: "route",
    title: "Zaspa",
    description: "Urban murals route.",
    distance: null,
    href: "/routes/zaspa/",
  },
  {
    type: "activity",
    title: "Dar Pomorza",
    category: "ship",
    href: "https://example.com/dar-pomorza",
  },
  {
    type: "food",
    title: "Pomelo",
    kind: "Breakfast",
    location: "Gdańsk",
    href: "https://www.pomelogdansk.pl/",
  },
];

describe("groupSearchResults", () => {
  it("returns every group, capped at 4 items, for an empty query", () => {
    const groups = groupSearchResults(items, "");

    expect(groups.map((group) => group.type)).toEqual([
      "route",
      "activity",
      "food",
    ]);
    expect(groups[0].items).toHaveLength(4);
    expect(groups[0].total).toBe(4);
  });

  it("matches on title case-insensitively", () => {
    const groups = groupSearchResults(items, "zaspa");

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("route");
    expect(groups[0].items.map((item) => item.title)).toEqual(["Zaspa"]);
  });

  it("matches routes on their description too", () => {
    const groups = groupSearchResults(items, "coastal");

    expect(groups[0].items.map((item) => item.title)).toEqual(["Sobieszewo"]);
  });

  it("matches activities on their category", () => {
    const groups = groupSearchResults(items, "ship");

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("activity");
  });

  it("matches food on name and kind", () => {
    expect(groupSearchResults(items, "breakfast")[0].type).toBe("food");
    expect(groupSearchResults(items, "pomelo")[0].type).toBe("food");
  });

  it("does not match food on location — it's display-only context", () => {
    // "gdańsk" only hits the route whose description mentions it; the food
    // item located in Gdańsk isn't indexed on that field.
    const groups = groupSearchResults(items, "gdańsk");
    expect(groups.map((group) => group.type)).not.toContain("food");
  });

  it("omits groups with no matches", () => {
    const groups = groupSearchResults(items, "pomelo");

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("food");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(groupSearchResults(items, "xyzzy")).toEqual([]);
  });

  it("reports a total higher than the capped item count when there are more than 4 matches", () => {
    const manyRoutes: SearchItem[] = Array.from({ length: 6 }, (_, i) => ({
      type: "route",
      title: `Route ${i}`,
      description: "trail",
      distance: "1.00 km",
      href: `/routes/route-${i}/`,
    }));

    const groups = groupSearchResults(manyRoutes, "route");

    expect(groups[0].items).toHaveLength(4);
    expect(groups[0].total).toBe(6);
  });

  it("ignores surrounding whitespace in the query", () => {
    const groups = groupSearchResults(items, "  zaspa  ");

    expect(groups[0].items.map((item) => item.title)).toEqual(["Zaspa"]);
  });
});
