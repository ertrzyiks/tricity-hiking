import { useEffect, useRef, useState } from "preact/hooks";
import type { KioskRoute } from "./types";
import { trackEvent } from "../../../services/analytics";
import {
  goHome,
  openRoute,
  stepDetail,
  handleIdleTimeout,
  handleInteraction,
  advanceAttract,
  type KioskState,
  IDLE_TIMEOUT_MS,
  ATTRACT_INTERVAL_MS,
} from "../../../services/kiosk";

export const KioskCarousel = ({ routes }: { routes: KioskRoute[] }) => {
  const [state, setState] = useState<KioskState>(goHome());
  const idleTimer = useRef<number | null>(null);

  // Any touch input resets the 90s idle clock. When it fires, the kiosk
  // drops into an unattended attract-mode spotlight cycle on the overview
  // grid (see the effect below), regardless of where the previous visitor
  // left off.
  useEffect(() => {
    const scheduleIdleReset = () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
      }

      idleTimer.current = window.setTimeout(() => {
        setState((current) => handleIdleTimeout(current));
      }, IDLE_TIMEOUT_MS);
    };

    scheduleIdleReset();

    const onInteraction = () => {
      setState((current) => handleInteraction(current));
      scheduleIdleReset();
    };

    window.addEventListener("pointerdown", onInteraction);

    return () => {
      window.removeEventListener("pointerdown", onInteraction);

      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
      }
    };
  }, []);

  // Attract mode auto-advances its spotlight every 8s. Keyed only on the
  // mode (not the index) so entering/leaving attract mode starts and stops
  // a single steady-interval timer, rather than one that restarts (and
  // skews) on every advance.
  useEffect(() => {
    if (state.mode !== "attract" || routes.length === 0) {
      return;
    }

    const id = window.setInterval(() => {
      setState((current) => advanceAttract(current, routes.length));
    }, ATTRACT_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [state.mode, routes.length]);

  const goHomeAndTrack = () => {
    trackEvent("kiosk home tapped");
    setState(goHome());
  };

  const openRouteAndTrack = (index: number) => {
    const selected = routes[index];

    if (selected) {
      trackEvent("kiosk route opened", { slug: selected.slug });
    }

    setState(openRoute(index));
  };

  const stepAndTrack = (direction: 1 | -1) => {
    setState((current) => {
      const next = stepDetail(current, direction, routes.length);
      const selected = routes[next.index];

      if (selected) {
        trackEvent("kiosk route stepped", {
          slug: selected.slug,
          direction: direction === 1 ? "next" : "prev",
        });
      }

      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white select-none touch-none overflow-hidden">
      <HomeButton onClick={goHomeAndTrack} />

      {state.mode !== "detail" && (
        <OverviewGrid
          routes={routes}
          spotlightIndex={state.mode === "attract" ? state.index : null}
          onSelect={openRouteAndTrack}
        />
      )}

      {state.mode === "detail" && routes[state.index] && (
        <RouteSlide
          route={routes[state.index]}
          onPrev={() => stepAndTrack(-1)}
          onNext={() => stepAndTrack(1)}
        />
      )}
    </div>
  );
};

const HomeButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Home"
    className="fixed top-4 left-4 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 active:bg-white/30"
  >
    <HomeIcon />
  </button>
);

const OverviewGrid = ({
  routes,
  spotlightIndex,
  onSelect,
}: {
  routes: KioskRoute[];
  spotlightIndex: number | null;
  onSelect: (index: number) => void;
}) => (
  <div className="h-full w-full overflow-y-auto pt-24 pb-8 px-8">
    <h1 className="mb-6 text-5xl font-bold">Tricity hiking trails</h1>

    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
    >
      {routes.map((route, index) => (
        <button
          key={route.slug}
          type="button"
          onClick={() => onSelect(index)}
          className={`group relative min-h-[200px] min-w-[200px] overflow-hidden rounded-2xl bg-slate-800 text-left transition-transform ${
            spotlightIndex === index ? "ring-4 ring-green-400 scale-105" : ""
          }`}
        >
          {route.previewSrc && (
            <img
              src={route.previewSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <span className="absolute bottom-4 left-4 right-4 text-2xl font-semibold">
            {route.title}
          </span>
        </button>
      ))}
    </div>
  </div>
);

const RouteSlide = ({
  route,
  onPrev,
  onNext,
}: {
  route: KioskRoute;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="absolute inset-0">
    {route.previewSrc && (
      <img
        src={route.previewSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

    <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
      <h2 className="text-5xl font-bold mb-4">{route.title}</h2>

      <p className="max-w-3xl text-xl md:text-2xl text-slate-100 mb-8">
        {route.summary}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
        <StatTile label="Distance" value={`${route.distanceKm.toFixed(2)}km`} />
        <StatTile label="Time" value={route.time} />
        <StatTile label="Total Gain" value={`${route.totalGain.toFixed(0)}m`} />
        <StatTile label="Total Loss" value={`${route.totalLoss.toFixed(0)}m`} />
      </div>
    </div>

    <button
      type="button"
      onClick={onPrev}
      aria-label="Previous route"
      className="fixed left-4 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30"
    >
      <ChevronIcon direction="left" />
    </button>
    <button
      type="button"
      onClick={onNext}
      aria-label="Next route"
      className="fixed right-4 top-1/2 z-10 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30"
    >
      <ChevronIcon direction="right" />
    </button>
  </div>
);

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-4xl font-semibold">{value}</div>
    <div className="text-lg uppercase text-slate-300">{label}</div>
  </div>
);

const HomeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
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
