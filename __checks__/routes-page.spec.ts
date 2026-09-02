import { test, expect } from "@playwright/test";

/**
 * Synthetic check for the routes list page, which renders a maplibre-gl map
 * (HomeMap) - the component most likely to silently break (see the "Fix map
 * not loading after maplibre-gl v6 upgrade" commit). Run by Checkly on its
 * own schedule (see checkly.config.ts) as a Browser Check, declared in
 * browser-checks.check.ts so it can be assigned to the "Tricity Hiking"
 * group.
 *
 * The actual homepage (`/`) doesn't render a maplibre-gl map - just a
 * static SVG - so it can't be used to catch this failure mode.
 */
test("routes page renders the map", async ({ page }) => {
  const response = await page.goto(
    "https://tricity-hiking.ertrzyiks.me/routes/",
  );

  expect(response?.status()).toBe(200);

  // maplibre-gl draws onto this canvas once it has actually initialized -
  // it never appears if, e.g., the map worker fails to load, which is
  // exactly the class of bug this check exists to catch.
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
    timeout: 15000,
  });
});
