/**
 * Logic for keeping a GitHub issue's route checklists (one per route
 * `group`) in sync with the routes that actually exist in the content
 * collection, and for deriving each route's `order` frontmatter value
 * from its position in the checklist.
 *
 * The issue body is treated as the source of truth for ordering: items can
 * be freely reordered in the GitHub UI (drag & drop), and that order is
 * what gets written back into the route files.
 */

/**
 * Every group the issue checklist tracks, and the markdown heading that
 * introduces its section in the issue body. Add an entry here (and to the
 * `group` enum in `src/content.config.ts`) to track another group - no
 * other change in this file is needed.
 * @type {{id: string, header: string}[]}
 */
export const GROUPS = [
  { id: "tricity", header: "## Routes" },
  { id: "day-trips", header: "## Day trips" },
];

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
 * Parse a full issue body into one checklist per configured group, keyed
 * by group id.
 * @param {string} body
 * @param {{id: string, header: string}[]} groups
 * @returns {Record<string, {slug: string, checked: boolean}[]>}
 */
export const parseIssueBody = (body = "", groups = GROUPS) => {
  const sections = Object.fromEntries(groups.map(({ id }) => [id, []]));
  const idByHeader = new Map(groups.map(({ id, header }) => [header, id]));
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

    if (idByHeader.has(trimmed)) {
      flush();
      current = idByHeader.get(trimmed);
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
 * Render each group's checklist back into an issue body, in the
 * configured group order.
 * @param {Record<string, {slug: string, checked: boolean}[]>} sections
 * @param {{id: string, header: string}[]} groups
 * @returns {string}
 */
export const renderIssueBody = (sections, groups = GROUPS) => {
  const renderSection = (header, items = []) => {
    if (items.length === 0) {
      return `${header}\n\n_No routes yet._`;
    }

    const lines = items.map(
      ({ slug, checked }) => `- [${checked ? "x" : " "}] ${slug}`,
    );
    return `${header}\n\n${lines.join("\n")}`;
  };

  return groups
    .map(({ id, header }) => renderSection(header, sections[id]))
    .join("\n\n");
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
