import { test, expect } from "@playwright/test";

/**
 * Synthetic uptime check for the homepage, run by Checkly on its own
 * schedule (see checkly.config.ts for frequency/locations) - this file is
 * picked up as a Browser Check via the `browserChecks.testMatch` glob, no
 * explicit BrowserCheck construct needed.
 */
test("homepage renders", async ({ page }) => {
  const response = await page.goto("https://tricity-hiking.ertrzyiks.me/");

  expect(response?.status()).toBe(200);
  // "Tricity Hiking" is in the shared layout's footer (see
  // src/layouts/Layout.astro) - a stand-in for "the page rendered all the
  // way through", not just returned a response.
  await expect(page.getByText("Tricity Hiking")).toBeVisible();
});
