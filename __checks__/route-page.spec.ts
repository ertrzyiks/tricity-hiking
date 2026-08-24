import { test, expect } from "@playwright/test";

/**
 * Synthetic check for a route detail page, which renders a maplibre-gl map -
 * the component most likely to silently break (see the "Fix map not loading
 * after maplibre-gl v6 upgrade" commit). Run by Checkly on its own schedule
 * (see checkly.config.ts) as a Browser Check, picked up via the
 * `browserChecks.testMatch` glob.
 */
test("route page renders the map", async ({ page }) => {
  const response = await page.goto(
    "https://tricity-hiking.ertrzyiks.me/routes/sobieszewo/",
  );

  expect(response?.status()).toBe(200);

  // maplibre-gl draws onto this canvas once it has actually initialized -
  // it never appears if, e.g., the map worker fails to load, which is
  // exactly the class of bug this check exists to catch.
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
    timeout: 15000,
  });
});
