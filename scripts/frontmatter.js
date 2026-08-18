/**
 * Minimal helpers for reading and writing single-line frontmatter fields
 * (`key: value`) in route `.mdx` files, without pulling in a full YAML
 * parser. Route frontmatter only ever uses flat scalar fields, so a
 * line-based approach is enough.
 */

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/**
 * Read a single frontmatter field's raw string value.
 * @param {string} content - Full file content
 * @param {string} key - Frontmatter key
 * @returns {string|undefined}
 */
export const getFrontmatterField = (content, key) => {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return undefined;

  const line = match[1].split("\n").find((l) => l.startsWith(`${key}:`));
  if (line === undefined) return undefined;

  return line.slice(key.length + 1).trim();
};

/**
 * Set (or insert) a single frontmatter field, preserving every other line.
 * @param {string} content - Full file content
 * @param {string} key - Frontmatter key
 * @param {string|number} value - New value, written unquoted
 * @returns {string} - Updated file content
 */
export const setFrontmatterField = (content, key, value) => {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error("No frontmatter block found");
  }

  const lines = match[1].split("\n");
  const lineIndex = lines.findIndex((l) => l.startsWith(`${key}:`));
  const newLine = `${key}: ${value}`;

  if (lineIndex >= 0) {
    lines[lineIndex] = newLine;
  } else {
    lines.push(newLine);
  }

  const newFrontmatter = `---\n${lines.join("\n")}\n---`;
  return (
    content.slice(0, match.index) +
    newFrontmatter +
    content.slice(match.index + match[0].length)
  );
};
