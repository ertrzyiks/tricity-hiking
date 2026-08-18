/**
 * Sort routes by their optional `order` frontmatter field, ascending.
 *
 * Routes without an explicit `order` are placed after all ordered routes,
 * keeping their original relative order (the sort is stable), so adding
 * `order` to a handful of routes doesn't require touching every entry.
 */
export const sortRoutes = <Route extends { data: { order?: number } }>(
  routes: Route[],
): Route[] => {
  return [...routes].sort((a, b) => {
    const orderA = a.data.order ?? Infinity;
    const orderB = b.data.order ?? Infinity;

    return orderA - orderB;
  });
};
