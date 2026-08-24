/// <reference types="vitest" />
import { getViteConfig } from "astro/config";
import { configDefaults } from "vitest/config";

export default getViteConfig({
  test: {
    // __checks__/**/*.spec.ts are Checkly Playwright checks, not vitest
    // tests - they use @playwright/test's own `test()`, which vitest can't
    // run.
    exclude: [...configDefaults.exclude, "__checks__/**"],
  },
});
