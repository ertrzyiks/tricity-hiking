import { defineConfig } from "checkly";
import { Frequency } from "checkly/constructs";

/**
 * See https://www.checklyhq.com/docs/cli/project-structure/
 */
const config = defineConfig({
  /* A human friendly name for your project */
  projectName: "Tricity Hiking",
  /** A logical ID that needs to be unique across your Checkly account,
   * See https://www.checklyhq.com/docs/cli/constructs/ to learn more about logical IDs.
   */
  logicalId: "tricity-hiking",
  /* Sets default values for Checks */
  checks: {
    /* Twice a day - this is an uptime check on a low-traffic site, not something
     * that needs minute-level resolution. */
    frequency: Frequency.EVERY_12H,
    /* Checkly data centers to run your Checks as monitors from */
    locations: ["eu-central-1", "us-east-1"],
    /** The Checkly Runtime identifier, determining npm packages and the Node.js version available at runtime.
     * See https://www.checklyhq.com/docs/cli/npm-packages/
     */
    runtimeId: "2026.04",
    /* A glob pattern that matches the Checks inside your repo, see https://www.checklyhq.com/docs/constructs/including-checks/#checks-checkmatch */
    checkMatch: "**/__checks__/**/*.check.ts",
    /* Global configuration option for Browser and Multistep checks. See https://www.checklyhq.com/docs/browser-checks/playwright-test/#global-configuration */
    playwrightConfig: {
      timeout: 30000,
      use: {
        viewport: { width: 1280, height: 720 },
      },
    },
    browserChecks: {
      /* Any Playwright .spec.ts file under __checks__/ automatically becomes a Browser Check -
       * see https://www.checklyhq.com/docs/constructs/including-checks/#browserchecks-testmatch */
      testMatch: "**/__checks__/**/*.spec.ts",
    },
  },
  cli: {
    /* The default datacenter location to use when running npx checkly test */
    runLocation: "eu-central-1",
    /* An array of default reporters to use when a reporter is not specified with the "--reporter" flag */
    reporters: ["list"],
    /* How many times to retry a failing test run when running `npx checkly test` or `npx checkly trigger` (max. 3) */
    retries: 0,
  },
});

export default config;
