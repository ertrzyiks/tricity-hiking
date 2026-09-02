import { BrowserCheck, CheckGroupV2 } from "checkly/constructs";

/**
 * Groups all synthetic Browser Checks under "Tricity Hiking" in the Checkly
 * UI, instead of leaving them ungrouped at the account root.
 *
 * Checks only pick up a group by being declared explicitly (via the `group`
 * property below) - the implicit checks that `browserChecks.testMatch`
 * would otherwise generate from *.spec.ts files can't be assigned a group,
 * see https://www.checklyhq.com/docs/constructs/check-group/. Declaring a
 * check here for a given spec file also removes it from that implicit
 * testMatch discovery, so there's no risk of it being registered twice.
 */
export const hikingGroup = new CheckGroupV2("tricity-hiking-group", {
  name: "Tricity Hiking",
});

new BrowserCheck("routes-page-check", {
  name: "routes-page.spec.ts",
  group: hikingGroup,
  code: {
    entrypoint: "./routes-page.spec.ts",
  },
});

new BrowserCheck("route-page-check", {
  name: "route-page.spec.ts",
  group: hikingGroup,
  code: {
    entrypoint: "./route-page.spec.ts",
  },
});
