import { atom } from "nanostores";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const DARK_CLASS = "cc--darkmode"; // toggles vanilla-cookieconsent's dark theme

export const $theme = atom<Theme>("light");

/**
 * Pure decision of which theme a page load should start in: an explicit
 * stored choice always wins, otherwise fall back to the OS preference.
 * Kept separate from the DOM/localStorage side effects below so it can be
 * unit tested without a browser.
 */
export function resolveInitialTheme({
  stored,
  prefersDark,
}: {
  stored: string | null;
  prefersDark: boolean;
}): Theme {
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return prefersDark ? "dark" : "light";
}

function applyThemeToDocument(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
}

/**
 * Sync the atom with whatever the inline head script already painted onto
 * <html>, then keep localStorage and the DOM in sync with future changes.
 * Call once, client-side, from the theme toggle island.
 */
export function initTheme() {
  if (typeof document === "undefined") {
    return;
  }

  $theme.set(getCurrentTheme());

  $theme.listen((theme) => {
    applyThemeToDocument(theme);

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage can be unavailable (private mode, disabled storage) -
      // the theme still works for the current page load, it just won't
      // persist across visits.
    }
  });
}

export function toggleTheme() {
  $theme.set($theme.get() === "dark" ? "light" : "dark");
}

export function setTheme(theme: Theme) {
  $theme.set(theme);
}

export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
