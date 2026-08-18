import { describe, it, expect } from "vitest";
import {
  parseChecklist,
  parseIssueBody,
  renderIssueBody,
  reconcileChecklist,
  computeOrderMap,
} from "./route-order-sync.js";

const GROUPS = [
  { id: "tricity", header: "## Routes" },
  { id: "day-trips", header: "## Day trips" },
];

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
  it("splits each group into its own list", () => {
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

    expect(parseIssueBody(body, GROUPS)).toEqual({
      tricity: [
        { slug: "route-a", checked: false },
        { slug: "route-b", checked: true },
      ],
      "day-trips": [{ slug: "trip-a", checked: false }],
    });
  });

  it("returns empty lists for a body with no matching sections", () => {
    expect(parseIssueBody("- [ ] b\n- [ ] a", GROUPS)).toEqual({
      tricity: [],
      "day-trips": [],
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

    expect(parseIssueBody(body, GROUPS)).toEqual({
      tricity: [{ slug: "route-a", checked: false }],
      "day-trips": [{ slug: "trip-a", checked: false }],
    });
  });

  it("supports an arbitrary number of configured groups", () => {
    const groups = [
      { id: "a", header: "## A" },
      { id: "b", header: "## B" },
      { id: "c", header: "## C" },
    ];
    const body = [
      "## A",
      "- [ ] a-1",
      "## B",
      "- [ ] b-1",
      "## C",
      "- [ ] c-1",
    ].join("\n");

    expect(parseIssueBody(body, groups)).toEqual({
      a: [{ slug: "a-1", checked: false }],
      b: [{ slug: "b-1", checked: false }],
      c: [{ slug: "c-1", checked: false }],
    });
  });
});

describe("renderIssueBody", () => {
  it("round-trips through parseIssueBody", () => {
    const sections = {
      tricity: [
        { slug: "route-a", checked: false },
        { slug: "route-b", checked: true },
      ],
      "day-trips": [{ slug: "trip-a", checked: false }],
    };

    expect(parseIssueBody(renderIssueBody(sections, GROUPS), GROUPS)).toEqual(
      sections,
    );
  });

  it("renders a placeholder for an empty section", () => {
    const body = renderIssueBody({ tricity: [], "day-trips": [] }, GROUPS);

    expect(body).toContain("## Routes\n\n_No routes yet._");
    expect(body).toContain("## Day trips\n\n_No routes yet._");
  });

  it("renders groups in the configured order", () => {
    const groups = [
      { id: "a", header: "## A" },
      { id: "b", header: "## B" },
    ];

    const body = renderIssueBody(
      { b: [{ slug: "b-1", checked: false }], a: [] },
      groups,
    );

    expect(body.indexOf("## A")).toBeLessThan(body.indexOf("## B"));
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
