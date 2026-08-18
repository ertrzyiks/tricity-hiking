/**
 * Sync route order with a GitHub issue checklist.
 *
 * The issue (see ROUTE_ORDER_ISSUE_NUMBER below) holds two checklists,
 * "## Routes" and "## Day trips", one item per route slug. This script:
 *
 *   1. Adds any route slug that isn't listed yet to the bottom of the
 *      right checklist (new routes show up automatically).
 *   2. Removes slugs for routes that no longer exist.
 *   3. Writes each route's position in its checklist back into its
 *      `order` frontmatter field, so the checklist order in the issue is
 *      what actually drives the map/list order on the site.
 *
 * Reordering routes is done by dragging items around in the GitHub issue
 * UI; the next run of this script (see the "Sync route order" workflow)
 * picks the new order up.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import {
  parseIssueBody,
  renderIssueBody,
  reconcileChecklist,
  computeOrderMap,
} from "./route-order-sync.js";
import { getFrontmatterField, setFrontmatterField } from "./frontmatter.js";

const ROUTES_DIR = "src/content/routes";
const ISSUE_NUMBER = process.env.ROUTE_ORDER_ISSUE_NUMBER || "221";

const listRouteFiles = () => {
  return fs
    .readdirSync(ROUTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const mdxPath = path.join(ROUTES_DIR, slug, `${slug}.mdx`);
      return fs.existsSync(mdxPath) ? { slug, mdxPath } : null;
    })
    .filter((route) => route !== null);
};

const loadRoutes = () => {
  return listRouteFiles().map(({ slug, mdxPath }) => {
    const content = fs.readFileSync(mdxPath, "utf8");

    return {
      slug,
      mdxPath,
      content,
      isDraft: getFrontmatterField(content, "draft") === "true",
      isTricity: getFrontmatterField(content, "tricity") === "true",
      order: getFrontmatterField(content, "order"),
    };
  });
};

const readIssueBody = () => {
  return execFileSync(
    "gh",
    ["issue", "view", ISSUE_NUMBER, "--json", "body", "--jq", ".body"],
    { encoding: "utf8" },
  );
};

const writeIssueBody = (body) => {
  const tmpFile = path.join(os.tmpdir(), `route-order-issue-${Date.now()}.md`);
  fs.writeFileSync(tmpFile, body);

  try {
    execFileSync("gh", ["issue", "edit", ISSUE_NUMBER, "--body-file", tmpFile]);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
};

const main = () => {
  const routes = loadRoutes().filter((route) => !route.isDraft);
  const routeSlugs = routes.filter((r) => r.isTricity).map((r) => r.slug);
  const dayTripSlugs = routes.filter((r) => !r.isTricity).map((r) => r.slug);

  const currentBody = readIssueBody();
  const sections = parseIssueBody(currentBody);

  const routesResult = reconcileChecklist(sections.routes, routeSlugs);
  const dayTripsResult = reconcileChecklist(sections.dayTrips, dayTripSlugs);

  const newBody = renderIssueBody({
    routes: routesResult.items,
    dayTrips: dayTripsResult.items,
  });

  if (newBody.trim() !== currentBody.trim()) {
    writeIssueBody(newBody);
    console.log(
      `Updated issue #${ISSUE_NUMBER}: ` +
        `+${routesResult.added.length + dayTripsResult.added.length} new, ` +
        `-${routesResult.removed.length + dayTripsResult.removed.length} removed`,
    );
    [...routesResult.added, ...dayTripsResult.added].forEach((slug) =>
      console.log(`  + ${slug}`),
    );
    [...routesResult.removed, ...dayTripsResult.removed].forEach((slug) =>
      console.log(`  - ${slug}`),
    );
  } else {
    console.log(`Issue #${ISSUE_NUMBER} checklist already up to date.`);
  }

  const orderMap = new Map([
    ...computeOrderMap(routesResult.items),
    ...computeOrderMap(dayTripsResult.items),
  ]);

  let changedFiles = 0;
  for (const route of routes) {
    const desiredOrder = orderMap.get(route.slug);
    if (desiredOrder === undefined) continue;
    if (String(desiredOrder) === route.order) continue;

    fs.writeFileSync(
      route.mdxPath,
      setFrontmatterField(route.content, "order", desiredOrder),
    );
    changedFiles++;
    console.log(`  ${route.slug}: order -> ${desiredOrder}`);
  }

  console.log(
    changedFiles > 0
      ? `Updated order on ${changedFiles} route file(s).`
      : "Route order already in sync.",
  );
};

main();
