import { describe, it, expect } from "vitest";
import {
  clampIndex,
  locateCardBySlug,
  resolveSwipeAction,
  type DeckKey,
} from "./cardDeck";

describe("cardDeck", () => {
  describe("clampIndex", () => {
    it("keeps an in-range index unchanged", () => {
      expect(clampIndex(2, 5)).toBe(2);
    });

    it("clamps an index below zero to zero", () => {
      expect(clampIndex(-3, 5)).toBe(0);
    });

    it("clamps an index at or beyond the length to the last item", () => {
      expect(clampIndex(5, 5)).toBe(4);
      expect(clampIndex(99, 5)).toBe(4);
    });

    it("returns zero for an empty deck", () => {
      expect(clampIndex(3, 0)).toBe(0);
    });
  });

  describe("locateCardBySlug", () => {
    const decks: Record<DeckKey, { slug: string }[]> = {
      tricity: [{ slug: "a" }, { slug: "b" }],
      nearby: [{ slug: "c" }, { slug: "d" }],
    };

    it("finds a card in the first deck that matches", () => {
      expect(locateCardBySlug(decks, "b")).toEqual({
        deckKey: "tricity",
        index: 1,
      });
    });

    it("finds a card in another deck when not in the first", () => {
      expect(locateCardBySlug(decks, "d")).toEqual({
        deckKey: "nearby",
        index: 1,
      });
    });

    it("returns null when the slug is not present in any deck", () => {
      expect(locateCardBySlug(decks, "missing")).toBeNull();
    });

    it("returns null when the slug is null", () => {
      expect(locateCardBySlug(decks, null)).toBeNull();
    });
  });

  describe("resolveSwipeAction", () => {
    it("returns null when the movement is below the threshold", () => {
      expect(resolveSwipeAction(10, 10, 50)).toBeNull();
    });

    it("resolves a leftward swipe to next", () => {
      expect(resolveSwipeAction(-80, 0, 50)).toBe("next");
    });

    it("resolves a rightward swipe to prev", () => {
      expect(resolveSwipeAction(80, 0, 50)).toBe("prev");
    });

    it("resolves an upward swipe to open", () => {
      expect(resolveSwipeAction(0, -80, 50)).toBe("open");
    });

    it("returns null for a downward swipe", () => {
      expect(resolveSwipeAction(0, 80, 50)).toBeNull();
    });

    it("prefers the dominant axis when both exceed the threshold", () => {
      expect(resolveSwipeAction(-90, 60, 50)).toBe("next");
      expect(resolveSwipeAction(60, -90, 50)).toBe("open");
    });
  });
});
