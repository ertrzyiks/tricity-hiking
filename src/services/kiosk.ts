export type KioskMode = "overview" | "detail" | "attract";

export interface KioskState {
  mode: KioskMode;
  index: number;
}

/** No touch input for this long returns the kiosk to its reset state. */
export const IDLE_TIMEOUT_MS = 90_000;

/** In attract mode, the current route slide advances at this interval. */
export const ATTRACT_INTERVAL_MS = 8_000;

/** The persistent "Home" action: always returns to the overview grid. */
export function goHome(): KioskState {
  return { mode: "overview", index: 0 };
}

/** Opens a specific route's full-screen detail slide, e.g. from a grid tap. */
export function openRoute(index: number): KioskState {
  return { mode: "detail", index };
}

/**
 * Manually pages to the next/previous route detail slide, wrapping around
 * the ends of the list. A no-op from the overview grid or an empty route
 * list. Paging manually while in attract mode hands control back to the
 * visitor by resolving into plain (non-attract) detail mode.
 */
export function stepDetail(
  state: KioskState,
  direction: 1 | -1,
  routeCount: number,
): KioskState {
  if (state.mode === "overview" || routeCount <= 0) {
    return state;
  }

  const nextIndex = (state.index + direction + routeCount) % routeCount;

  return { mode: "detail", index: nextIndex };
}

/**
 * After IDLE_TIMEOUT_MS of no touch input, the kiosk resets to attract
 * mode: a slideshow that starts over from the first route, regardless of
 * where the visitor left off.
 */
export function handleIdleTimeout(state: KioskState): KioskState {
  if (state.mode === "attract") {
    return state;
  }

  return { mode: "attract", index: 0 };
}

/**
 * Any touch input cancels attract mode and returns to the overview grid
 * (not wherever attract mode happened to be showing). Touch input outside
 * attract mode only resets the idle timer, which the caller handles
 * separately — the state itself doesn't change.
 */
export function handleInteraction(state: KioskState): KioskState {
  if (state.mode === "attract") {
    return goHome();
  }

  return state;
}

/** Advances attract mode's slideshow by one route, wrapping around. */
export function advanceAttract(
  state: KioskState,
  routeCount: number,
): KioskState {
  if (state.mode !== "attract" || routeCount <= 0) {
    return state;
  }

  return { mode: "attract", index: (state.index + 1) % routeCount };
}
