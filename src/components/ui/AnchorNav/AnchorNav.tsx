import { useEffect, useState } from "preact/hooks";

// Prototype for issue #3 (single continuous scroll, no page nav) — see
// .scratch/new-ui-prototypes/issues/03-single-scroll-no-nav.md.
//
// Rendered right before the `#map` section on the single-scroll homepage, so
// it only starts sticking to the top of the viewport once the hero and the
// "Why Tricity" intro have scrolled past — no extra show/hide logic needed,
// that's just how `position: sticky` behaves at that placement.

export const SECTIONS = [
  { id: "map", label: "Map" },
  { id: "routes", label: "Routes" },
  { id: "activities", label: "Activities" },
  { id: "food", label: "Food" },
  { id: "history", label: "History" },
] as const;

export const AnchorNav = () => {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const sections = SECTIONS.map(({ id }) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    // Treat the vertical middle 10% of the viewport as "current section" —
    // narrow enough that scroll-spy doesn't flicker between neighbours.
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          setActiveId(mostVisible.target.id);
        }
      },
      {
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200"
      aria-label="Section navigation"
    >
      <ul className="max-w-(--breakpoint-xl) mx-auto flex justify-center gap-6 px-2 py-3 text-sm overflow-x-auto">
        {SECTIONS.map(({ id, label }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              className={`inline-block pb-1 border-b-2 transition-colors ${
                activeId === id
                  ? "text-green-600 border-green-600"
                  : "text-slate-600 border-transparent hover:text-green-600"
              }`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
