import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "./Icon";
import {
  groupSearchResults,
  type SearchItem,
} from "../../../services/searchIndex";

// Homepage search: a Cmd-K style palette over routes, activities, and food,
// triggered by clicking/focusing the search bar or Cmd/Ctrl+K from anywhere
// on the page. The header keeps its full link menu; this is a search
// affordance layered on top, not a replacement for it — see
// .scratch/new-ui-prototypes/issues/05-command-palette-nav.md for the
// original spec this was prototyped from.

const GROUP_ICON: Record<SearchItem["type"], IconName> = {
  route: "hiking",
  activity: "forest",
  food: "silverware",
};

// Where "see all in <Group>" points — the existing browse pages for each
// type. Not query-filtered: the palette is a navigation layer over these
// pages, not a new search-results page.
const SEE_ALL_HREF: Record<SearchItem["type"], string> = {
  route: "/routes/",
  activity: "/activities/",
  food: "/food/",
};

function isExternal(href: string): boolean {
  return href.startsWith("http");
}

function resultContext(item: SearchItem): string {
  switch (item.type) {
    case "route":
      return item.distance ?? item.description;
    case "activity":
      return item.category;
    case "food":
      return `${item.kind} · ${item.location}`;
  }
}

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Fetch the build-time search index once. It's a small static JSON file
  // (src/pages/search-index.json.ts), not a per-keystroke request.
  useEffect(() => {
    let cancelled = false;

    fetch("/search-index.json")
      .then((response) => response.json())
      .then((data: SearchItem[]) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Cmd/Ctrl+K toggles the palette from anywhere on the page, so the
  // shortcut works even after scrolling past the search bar on the
  // homepage.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isShortcut) {
        event.preventDefault();
        setIsOpen((wasOpen) => !wasOpen);
        return;
      }

      if (event.key === "Escape" && isOpen) {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const groups = useMemo(
    () => (items ? groupSearchResults(items, query) : []),
    [items, query],
  );

  const resultCount = useMemo(
    () => groups.reduce((count, group) => count + group.items.length, 0),
    [groups],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(resultCount - 1, 0)),
    );
  }, [resultCount]);

  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, resultCount - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      resultRefs.current[activeIndex]?.click();
    }
  };

  let cursor = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        class="flex items-center gap-2 w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700"
      >
        <Icon name="magnify" className="w-4 h-4 shrink-0" />
        <span class="truncate">Search routes, activities, food…</span>
        <span class="ml-auto hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 sm:inline">
          ⌘K
        </span>
      </button>

      {isOpen && (
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-2 pt-[8vh] sm:pt-[12vh]"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search routes, activities, and food"
            class="flex w-full max-w-xl max-h-[80vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Icon
                name="magnify"
                className="w-5 h-5 shrink-0 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onInput={(event) =>
                  setQuery((event.target as HTMLInputElement).value)
                }
                onKeyDown={onInputKeyDown}
                placeholder="Search routes, activities, food…"
                aria-label="Search routes, activities, and food"
                autocomplete="off"
                spellcheck={false}
                class="flex-1 text-base outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                class="text-slate-400 hover:text-slate-600"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto py-2">
              {items === null && (
                <p class="px-4 py-6 text-sm text-slate-400">Loading…</p>
              )}

              {items !== null && groups.length === 0 && (
                <p class="px-4 py-6 text-sm text-slate-400">
                  No matches for “{query}”.
                </p>
              )}

              {groups.map((group) => (
                <div class="px-2" key={group.type}>
                  <div class="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((item) => {
                      cursor += 1;
                      const flatIndex = cursor;
                      const active = flatIndex === activeIndex;
                      const external = isExternal(item.href);

                      return (
                        <li key={item.href}>
                          <a
                            ref={(el) => {
                              resultRefs.current[flatIndex] = el;
                            }}
                            href={item.href}
                            {...(external
                              ? { target: "_blank", rel: "noopener" }
                              : {})}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            class={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm ${
                              active
                                ? "bg-green-50 text-green-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <Icon
                              name={GROUP_ICON[item.type]}
                              className="w-4 h-4 shrink-0 text-slate-400"
                            />
                            <span class="truncate">{item.title}</span>
                            <span class="ml-auto shrink-0 pl-2 text-xs text-slate-400">
                              {resultContext(item)}
                            </span>
                            {external && (
                              <Icon
                                name="open-in-new"
                                className="w-3 h-3 shrink-0 text-slate-300"
                              />
                            )}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  {group.total > group.items.length && (
                    <a
                      href={SEE_ALL_HREF[group.type]}
                      class="block px-2 py-1.5 text-xs text-green-600 hover:underline"
                    >
                      See all in {group.label} →
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div class="hidden shrink-0 items-center gap-4 border-t border-slate-100 px-4 py-2 text-xs text-slate-400 sm:flex">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommandPalette;
