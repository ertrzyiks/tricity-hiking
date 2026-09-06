import { useEffect, useRef, useState } from "preact/hooks";
import {
  clampIndex,
  locateCardBySlug,
  resolveSwipeAction,
  type DeckKey,
} from "../../../services/cardDeck";
import type { DeckCard } from "./types";
import { trackEvent } from "../../../services/analytics";
import { Button } from "../Button/Button";

const SWIPE_THRESHOLD = 60;

const DECK_LABELS: Record<DeckKey, string> = {
  tricity: "Tricity",
  nearby: "Nearby",
};

const getSlugFromURL = () =>
  new URL(window.location.href).searchParams.get("route");

const updateURL = (slug: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set("route", slug);
  window.history.pushState({}, "", url);
};

export const CardDeck = ({ decks }: { decks: Record<DeckKey, DeckCard[]> }) => {
  const [activeDeck, setActiveDeck] = useState<DeckKey>("tricity");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const hasRestoredFromURL = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const cards = decks[activeDeck];
  const card = cards[activeIndex] as DeckCard | undefined;

  // Restore deck/index from a shared `?route=<slug>` URL: on first mount,
  // and again on browser back/forward so the deck follows history rather
  // than just the address bar.
  useEffect(() => {
    const restoreFromURL = () => {
      const located = locateCardBySlug(decks, getSlugFromURL());

      if (located) {
        setActiveDeck(located.deckKey);
        setActiveIndex(located.index);
      }
    };

    restoreFromURL();
    hasRestoredFromURL.current = true;

    window.addEventListener("popstate", restoreFromURL);
    return () => window.removeEventListener("popstate", restoreFromURL);
  }, []);

  // Keep the URL in sync so a given card is shareable/bookmarkable, without
  // triggering a full navigation. Skipped when the URL already points at
  // this card, so restoring state from a `popstate` event doesn't turn
  // right back around and push a new entry on top of the one the user
  // just navigated back to.
  useEffect(() => {
    if (!hasRestoredFromURL.current || !card) {
      return;
    }

    if (getSlugFromURL() === card.slug) {
      return;
    }

    updateURL(card.slug);
  }, [activeDeck, activeIndex, card]);

  const goNext = () => {
    setActiveIndex((index) => clampIndex(index + 1, cards.length));
  };

  const goPrev = () => {
    setActiveIndex((index) => clampIndex(index - 1, cards.length));
  };

  const openDetail = () => {
    if (!card) {
      return;
    }

    trackEvent("discover card opened", { slug: card.slug });
    window.location.href = `/routes/${card.slug}/`;
  };

  const switchDeck = (deckKey: DeckKey) => {
    if (deckKey === activeDeck) {
      return;
    }

    setActiveDeck(deckKey);
    setActiveIndex(0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handlePointerDown = (event: PointerEvent) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragStart.current) {
      return;
    }

    setDragX(event.clientX - dragStart.current.x);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!dragStart.current) {
      return;
    }

    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    const action = resolveSwipeAction(deltaX, deltaY, SWIPE_THRESHOLD);

    dragStart.current = null;
    setDragX(0);

    if (action === "next") {
      goNext();
    } else if (action === "prev") {
      goPrev();
    } else if (action === "open") {
      openDetail();
    }
  };

  if (!card) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No routes in this deck yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center gap-2 py-3">
        {(Object.keys(decks) as DeckKey[]).map((deckKey) => (
          <button
            key={deckKey}
            type="button"
            onClick={() => switchDeck(deckKey)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
              deckKey === activeDeck
                ? "bg-green-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {DECK_LABELS[deckKey]} ({decks[deckKey].length})
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl bg-slate-800 select-none">
        <div
          className="absolute inset-0 touch-pan-y"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragStart.current ? "none" : "transform 200ms ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {card.previewSrc && (
            <img
              src={card.previewSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          <div className="absolute inset-x-0 bottom-0 p-6 text-white pointer-events-none">
            <h2 className="text-2xl font-bold mb-1">{card.title}</h2>
            <p className="text-sm text-slate-200 mb-4 line-clamp-2">
              {card.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
              <div>
                <div className="text-lg font-semibold">
                  {card.distanceKm.toFixed(2)}km
                </div>
                <div className="text-xs uppercase text-slate-300">Distance</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{card.time}</div>
                <div className="text-xs uppercase text-slate-300">Time</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {card.totalGain.toFixed(0)}m
                </div>
                <div className="text-xs uppercase text-slate-300">
                  Total Gain
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {card.totalLoss.toFixed(0)}m
                </div>
                <div className="text-xs uppercase text-slate-300">
                  Total Loss
                </div>
              </div>
            </div>

            <div className="pointer-events-auto inline-block">
              <Button onClick={openDetail}>View route →</Button>
            </div>
          </div>
        </div>

        {activeIndex > 0 && (
          <button
            type="button"
            aria-label="Previous route"
            onClick={goPrev}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronIcon direction="left" />
          </button>
        )}

        {activeIndex < cards.length - 1 && (
          <button
            type="button"
            aria-label="Next route"
            onClick={goNext}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 items-center justify-center w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>

      <div className="text-center py-3 text-sm text-slate-500">
        {activeIndex + 1} / {cards.length}
      </div>
    </div>
  );
};

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline
      points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
    />
  </svg>
);
