export type SearchItem =
  | {
      type: "route";
      title: string;
      description: string;
      distance: string | null;
      href: string;
    }
  | {
      type: "activity";
      title: string;
      category: string;
      href: string;
    }
  | {
      type: "food";
      title: string;
      kind: string;
      location: string;
      href: string;
    };

export type SearchGroup = {
  type: SearchItem["type"];
  label: string;
  items: SearchItem[];
  total: number;
};

const GROUP_LABELS: Record<SearchItem["type"], string> = {
  route: "Routes",
  activity: "Activities",
  food: "Food",
};

const GROUP_ORDER: SearchItem["type"][] = ["route", "activity", "food"];

const MAX_RESULTS_PER_GROUP = 4;

function searchableText(item: SearchItem): string {
  switch (item.type) {
    case "route":
      return `${item.title} ${item.description}`;
    case "activity":
      return `${item.title} ${item.category}`;
    case "food":
      return `${item.title} ${item.kind} ${item.location}`;
  }
}

function matches(item: SearchItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return searchableText(item).toLowerCase().includes(normalizedQuery);
}

/**
 * Filters the flat search index down to what matches `query`, grouped by
 * type in a fixed order (Routes, Activities, Food) and capped at
 * `MAX_RESULTS_PER_GROUP` per group. `group.total` keeps the untruncated
 * count so callers can render a "see all" link when there's more.
 */
export function groupSearchResults(
  items: SearchItem[],
  query: string,
): SearchGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = items.filter((item) => matches(item, normalizedQuery));

  return GROUP_ORDER.map((type): SearchGroup => {
    const typeItems = filtered.filter((item) => item.type === type);

    return {
      type,
      label: GROUP_LABELS[type],
      items: typeItems.slice(0, MAX_RESULTS_PER_GROUP),
      total: typeItems.length,
    };
  }).filter((group) => group.total > 0);
}
