import { describe, it, expect } from "vitest";
import {
  parseChecklist,
  parseIssueBody,
  renderIssueBody,
  reconcileChecklist,
  computeOrderMap,
} from "./route-order-sync.js";

describe("parseChecklist", () => {
  it("parses checked and unchecked items", () => {
    const text = "- [ ] alpha\n- [x] beta\n- [X] gamma";

    expect(parseChecklist(text)).toEqual([
      { slug: "alpha", checked: false },
      { slug: "beta", checked: true },
      { slug: "gamma", checked: true },
    ]);
  });

  it("ignores non-checklist lines", () => {
    const text = "Some intro text\n- [ ] alpha\n\nMore text";

    expect(parseChecklist(text)).toEqual([{ slug: "alpha", checked: false }]);
  });
});

describe("parseIssueBody", () => {
  it("splits routes and day trips into separate lists", () => {
    const body = [
      "## Routes",
      "",
      "- [ ] route-a",
      "- [x] route-b",
      "",
      "## Day trips",
      "",
      "- [ ] trip-a",
    ].join("\n");

    expect(parseIssueBody(body)).toEqual({
      routes: [
        { slug: "route-a", checked: false },
        { slug: "route-b", checked: true },
      ],
      dayTrips: [{ slug: "trip-a", checked: false }],
    });
  });

  it("returns empty lists for a body with no matching sections", () => {
    expect(parseIssueBody("- [ ] b\n- [ ] a")).toEqual({
      routes: [],
      dayTrips: [],
    });
  });

  it("stops a section at the next heading", () => {
    const body = [
      "## Routes",
      "- [ ] route-a",
      "## Something else",
      "- [ ] not-a-route",
      "## Day trips",
      "- [ ] trip-a",
    ].join("\n");

    expect(parseIssueBody(body)).toEqual({
      routes: [{ slug: "route-a", checked: false }],
      dayTrips: [{ slug: "trip-a", checked: false }],
    });
  });
});

describe("renderIssueBody", () => {
  it("round-trips through parseIssueBody", () => {
    const sections = {
      routes: [
        { slug: "route-a", checked: false },
        { slug: "route-b", checked: true },
      ],
      dayTrips: [{ slug: "trip-a", checked: false }],
    };

    expect(parseIssueBody(renderIssueBody(sections))).toEqual(sections);
  });

  it("renders a placeholder for an empty section", () => {
    const body = renderIssueBody({ routes: [], dayTrips: [] });

    expect(body).toContain("## Routes\n\n_No routes yet._");
    expect(body).toContain("## Day trips\n\n_No routes yet._");
  });
});

describe("reconcileChecklist", () => {
  it("keeps existing items and their checked state, in place", () => {
    const existing = [
      { slug: "b", checked: true },
      { slug: "a", checked: false },
    ];

    const result = reconcileChecklist(existing, ["a", "b"]);

    expect(result.items).toEqual(existing);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("appends new slugs to the bottom, alphabetically", () => {
    const existing = [{ slug: "b", checked: true }];

    const result = reconcileChecklist(existing, ["b", "d", "c"]);

    expect(result.items).toEqual([
      { slug: "b", checked: true },
      { slug: "c", checked: false },
      { slug: "d", checked: false },
    ]);
    expect(result.added).toEqual(["c", "d"]);
  });

  it("drops slugs that no longer exist", () => {
    const existing = [
      { slug: "a", checked: false },
      { slug: "gone", checked: true },
    ];

    const result = reconcileChecklist(existing, ["a"]);

    expect(result.items).toEqual([{ slug: "a", checked: false }]);
    expect(result.removed).toEqual(["gone"]);
  });
});

describe("computeOrderMap", () => {
  it("maps each slug to its 1-based position", () => {
    const items = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];

    expect(computeOrderMap(items)).toEqual(
      new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
    );
  });
});
