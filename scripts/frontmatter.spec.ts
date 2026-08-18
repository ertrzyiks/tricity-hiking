import { describe, it, expect } from "vitest";
import { getFrontmatterField, setFrontmatterField } from "./frontmatter.js";

const SAMPLE = `---
title: Test Route
geojson: test-route
description: A short loop
tricity: true
---

## Body

Some content.
`;

describe("getFrontmatterField", () => {
  it("reads an existing field", () => {
    expect(getFrontmatterField(SAMPLE, "title")).toBe("Test Route");
    expect(getFrontmatterField(SAMPLE, "tricity")).toBe("true");
  });

  it("returns undefined for a missing field", () => {
    expect(getFrontmatterField(SAMPLE, "order")).toBeUndefined();
  });

  it("returns undefined when there is no frontmatter block", () => {
    expect(getFrontmatterField("no frontmatter here", "title")).toBeUndefined();
  });
});

describe("setFrontmatterField", () => {
  it("inserts a new field at the end of the frontmatter block", () => {
    const updated = setFrontmatterField(SAMPLE, "order", 3);

    expect(getFrontmatterField(updated, "order")).toBe("3");
    expect(updated).toContain("---\ntitle: Test Route");
    expect(updated).toContain("## Body");
  });

  it("replaces an existing field in place", () => {
    const withOrder = setFrontmatterField(SAMPLE, "order", 3);
    const updated = setFrontmatterField(withOrder, "order", 7);

    expect(getFrontmatterField(updated, "order")).toBe("7");
    expect(updated.match(/^order:/gm)?.length).toBe(1);
  });

  it("leaves every other line untouched", () => {
    const updated = setFrontmatterField(SAMPLE, "order", 3);

    expect(getFrontmatterField(updated, "geojson")).toBe("test-route");
    expect(getFrontmatterField(updated, "description")).toBe("A short loop");
    expect(getFrontmatterField(updated, "tricity")).toBe("true");
  });

  it("throws when there is no frontmatter block", () => {
    expect(() =>
      setFrontmatterField("no frontmatter here", "order", 1),
    ).toThrow();
  });
});
