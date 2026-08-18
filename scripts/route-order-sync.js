/**
 * Logic for keeping a GitHub issue's route checklists (one for `Routes`,
 * one for `Day trips`) in sync with the routes that actually exist in the
 * content collection, and for deriving each route's `order` frontmatter
 * value from its position in the checklist.
 *
 * The issue body is treated as the source of truth for ordering: items can
 * be freely reordered in the GitHub UI (drag & drop), and that order is
 * what gets written back into the route files.
 */

export const SECTION_HEADERS = {
  routes: "## Routes",
  dayTrips: "## Day trips",
};

const CHECKLIST_ITEM_RE = /^- \[([ xX])\]\s+(.+?)\s*$/;

/**
 * Parse a block of markdown into checklist items.
 * @param {string} sectionText
 * @returns {{slug: string, checked: boolean}[]}
 */
export const parseChecklist = (sectionText) => {
  return sectionText
    .split("\n")
    .map((line) => line.match(CHECKLIST_ITEM_RE))
    .filter((match) => match !== null)
    .map((match) => ({
      slug: match[2].trim(),
      checked: match[1].toLowerCase() === "x",
    }));
};

/**
 * Parse a full issue body into its `routes` and `dayTrips` checklists.
 * @param {string} body
 * @returns {{routes: {slug: string, checked: boolean}[], dayTrips: {slug: string, checked: boolean}[]}}
 */
export const parseIssueBody = (body = "") => {
  const sections = { routes: [], dayTrips: [] };
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current) {
      sections[current] = parseChecklist(buffer.join("\n"));
    }
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === SECTION_HEADERS.routes) {
      flush();
      current = "routes";
      continue;
    }

    if (trimmed === SECTION_HEADERS.dayTrips) {
      flush();
      current = "dayTrips";
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flush();
      current = null;
      continue;
    }

    buffer.push(line);
  }
  flush();

  return sections;
};

/**
 * Render the two checklists back into an issue body.
 * @param {{routes: {slug: string, checked: boolean}[], dayTrips: {slug: string, checked: boolean}[]}} sections
 * @returns {string}
 */
export const renderIssueBody = ({ routes, dayTrips }) => {
  const renderSection = (header, items) => {
    if (items.length === 0) {
      return `${header}\n\n_No routes yet._`;
    }

    const lines = items.map(
      ({ slug, checked }) => `- [${checked ? "x" : " "}] ${slug}`,
    );
    return `${header}\n\n${lines.join("\n")}`;
  };

  return [
    renderSection(SECTION_HEADERS.routes, routes),
    renderSection(SECTION_HEADERS.dayTrips, dayTrips),
  ].join("\n\n");
};

/**
 * Reconcile a checklist against the slugs that currently exist: keeps
 * existing items in place (with their checked state), drops slugs that no
 * longer exist, and appends any new slugs to the bottom (alphabetically,
 * so a batch of new routes lands in a deterministic order).
 * @param {{slug: string, checked: boolean}[]} existingItems
 * @param {string[]} currentSlugs
 */
export const reconcileChecklist = (existingItems, currentSlugs) => {
  const currentSlugSet = new Set(currentSlugs);
  const existingSlugSet = new Set(existingItems.map((item) => item.slug));

  const kept = existingItems.filter((item) => currentSlugSet.has(item.slug));
  const addedSlugs = currentSlugs
    .filter((slug) => !existingSlugSet.has(slug))
    .sort();
  const added = addedSlugs.map((slug) => ({ slug, checked: false }));

  const removed = existingItems
    .filter((item) => !currentSlugSet.has(item.slug))
    .map((item) => item.slug);

  return {
    items: [...kept, ...added],
    added: addedSlugs,
    removed,
  };
};

/**
 * Map each item's slug to its 1-based position in the list.
 * @param {{slug: string}[]} items
 * @returns {Map<string, number>}
 */
export const computeOrderMap = (items) => {
  return new Map(items.map((item, index) => [item.slug, index + 1]));
};
