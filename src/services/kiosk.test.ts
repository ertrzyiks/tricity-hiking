import { describe, it, expect } from "vitest";
import {
  goHome,
  openRoute,
  stepDetail,
  handleIdleTimeout,
  handleInteraction,
  advanceAttract,
  IDLE_TIMEOUT_MS,
  ATTRACT_INTERVAL_MS,
} from "./kiosk";

describe("kiosk", () => {
  describe("goHome", () => {
    it("always resolves to the overview grid", () => {
      expect(goHome()).toEqual({ mode: "overview", index: 0 });
    });
  });

  describe("openRoute", () => {
    it("opens the given route in detail mode", () => {
      expect(openRoute(3)).toEqual({ mode: "detail", index: 3 });
    });
  });

  describe("stepDetail", () => {
    it("moves to the next route, wrapping past the end", () => {
      expect(stepDetail({ mode: "detail", index: 2 }, 1, 3)).toEqual({
        mode: "detail",
        index: 0,
      });
    });

    it("moves to the previous route, wrapping before the start", () => {
      expect(stepDetail({ mode: "detail", index: 0 }, -1, 3)).toEqual({
        mode: "detail",
        index: 2,
      });
    });

    it("exits attract mode into plain detail mode when stepping manually", () => {
      expect(stepDetail({ mode: "attract", index: 0 }, 1, 3)).toEqual({
        mode: "detail",
        index: 1,
      });
    });

    it("is a no-op from the overview grid", () => {
      const state = { mode: "overview" as const, index: 0 };
      expect(stepDetail(state, 1, 3)).toBe(state);
    });

    it("is a no-op when there are no routes", () => {
      const state = { mode: "detail" as const, index: 0 };
      expect(stepDetail(state, 1, 0)).toBe(state);
    });
  });

  describe("handleIdleTimeout", () => {
    it("drops the overview grid into attract mode starting from the first route", () => {
      expect(handleIdleTimeout({ mode: "overview", index: 0 })).toEqual({
        mode: "attract",
        index: 0,
      });
    });

    it("drops an open route detail into attract mode starting from the first route", () => {
      expect(handleIdleTimeout({ mode: "detail", index: 5 })).toEqual({
        mode: "attract",
        index: 0,
      });
    });

    it("is a no-op when already in attract mode", () => {
      const state = { mode: "attract" as const, index: 2 };
      expect(handleIdleTimeout(state)).toBe(state);
    });
  });

  describe("handleInteraction", () => {
    it("cancels attract mode back to the overview grid", () => {
      expect(handleInteraction({ mode: "attract", index: 4 })).toEqual({
        mode: "overview",
        index: 0,
      });
    });

    it("leaves the overview grid unchanged", () => {
      const state = { mode: "overview" as const, index: 0 };
      expect(handleInteraction(state)).toBe(state);
    });

    it("leaves an open route detail unchanged", () => {
      const state = { mode: "detail" as const, index: 2 };
      expect(handleInteraction(state)).toBe(state);
    });
  });

  describe("advanceAttract", () => {
    it("advances to the next route, wrapping past the end", () => {
      expect(advanceAttract({ mode: "attract", index: 2 }, 3)).toEqual({
        mode: "attract",
        index: 0,
      });
    });

    it("is a no-op outside attract mode", () => {
      const state = { mode: "detail" as const, index: 0 };
      expect(advanceAttract(state, 3)).toBe(state);
    });

    it("is a no-op when there are no routes", () => {
      const state = { mode: "attract" as const, index: 0 };
      expect(advanceAttract(state, 0)).toBe(state);
    });
  });

  describe("timing constants", () => {
    it("waits 90s of no touch input before attract mode kicks in", () => {
      expect(IDLE_TIMEOUT_MS).toBe(90_000);
    });

    it("advances attract mode every 8s", () => {
      expect(ATTRACT_INTERVAL_MS).toBe(8_000);
    });
  });
});
