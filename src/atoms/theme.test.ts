import { describe, expect, it } from "vitest";
import { resolveInitialTheme } from "./theme";

describe("resolveInitialTheme", () => {
  it("uses the stored preference when it is a valid theme", () => {
    expect(resolveInitialTheme({ stored: "dark", prefersDark: false })).toBe(
      "dark",
    );
    expect(resolveInitialTheme({ stored: "light", prefersDark: true })).toBe(
      "light",
    );
  });

  it("falls back to the OS preference when nothing is stored", () => {
    expect(resolveInitialTheme({ stored: null, prefersDark: true })).toBe(
      "dark",
    );
    expect(resolveInitialTheme({ stored: null, prefersDark: false })).toBe(
      "light",
    );
  });

  it("falls back to the OS preference when the stored value is garbage", () => {
    expect(resolveInitialTheme({ stored: "banana", prefersDark: true })).toBe(
      "dark",
    );
  });
});
