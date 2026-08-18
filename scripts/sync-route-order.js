/**
 * Sync route order with a GitHub issue checklist.
 *
 * The issue (see ROUTE_ORDER_ISSUE_NUMBER below) holds one checklist per
 * route group (see GROUPS in route-order-sync.js), one item per route
 * slug. This script:
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
  GROUPS,
  parseIssueBody,
  renderIssueBody,
  reconcileChecklist,
  computeOrderMap,
} from "./route-order-sync.js";
import { getFrontmatterField, setFrontmatterField } from "./frontmatter.js";

const ROUTES_DIR = "src/content/routes";
const ISSUE_NUMBER = process.env.ROUTE_ORDER_ISSUE_NUMBER || "221";

// Mirrors the `group` field's default in src/content.config.ts, for routes
// whose frontmatter omits it.
const DEFAULT_GROUP = "day-trips";

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
      group: getFrontmatterField(content, "group") ?? DEFAULT_GROUP,
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

  const currentBody = readIssueBody();
  const sections = parseIssueBody(currentBody);

  const results = Object.fromEntries(
    GROUPS.map(({ id }) => {
      const slugs = routes
        .filter((route) => route.group === id)
        .map((route) => route.slug);
      return [id, reconcileChecklist(sections[id], slugs)];
    }),
  );

  const newBody = renderIssueBody(
    Object.fromEntries(GROUPS.map(({ id }) => [id, results[id].items])),
  );

  if (newBody.trim() !== currentBody.trim()) {
    writeIssueBody(newBody);

    const added = GROUPS.flatMap(({ id }) => results[id].added);
    const removed = GROUPS.flatMap(({ id }) => results[id].removed);

    console.log(
      `Updated issue #${ISSUE_NUMBER}: +${added.length} new, -${removed.length} removed`,
    );
    added.forEach((slug) => console.log(`  + ${slug}`));
    removed.forEach((slug) => console.log(`  - ${slug}`));
  } else {
    console.log(`Issue #${ISSUE_NUMBER} checklist already up to date.`);
  }

  const orderMap = new Map(
    GROUPS.flatMap(({ id }) => [...computeOrderMap(results[id].items)]),
  );

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
