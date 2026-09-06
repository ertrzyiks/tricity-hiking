/**
 * Shared interaction behaviour for the /routes navigation prototypes.
 *
 * Every variant (routes1..routes5) renders the same four panels
 * (`data-panel="map|tricity|nearby|detail"`) and its own chrome of trigger
 * elements (`data-panel-target="map|tricity|nearby"`). This module wires
 * panel switching, ARIA state, focus management, a "detail" drill-down
 * populated from whichever route was clicked, and hash-based deep linking
 * so each variant behaves like real navigation rather than a slideshow.
 *
 * UX rules applied here (see also each page's own comments):
 * - deep linking / bookmarkability of the current view (location.hash)
 * - focus is moved to the new panel's heading on navigation, per the
 *   WAI-ARIA Authoring Practices guidance for client-side route changes
 * - visited/active state is reflected on every trigger for a given target,
 *   even when a pattern renders more than one control for it (e.g. a
 *   sidebar item and a breadcrumb chip)
 */

export type RoutesPanelId = "map" | "tricity" | "nearby" | "detail";

const PANEL_LABELS: Record<RoutesPanelId, string> = {
  map: "Map",
  tricity: "Tricity",
  nearby: "Nearby",
  detail: "Route",
};

interface ActivateOptions {
  detailTitle?: string;
  focus?: boolean;
  updateHash?: boolean;
  hashSuffix?: string;
}

export function initRoutesPrototypeNav(root: ParentNode = document): void {
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));
  const triggers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-panel-target]"),
  );
  const breadcrumbSlots = Array.from(
    root.querySelectorAll<HTMLElement>("[data-breadcrumb-current]"),
  );
  const backTriggers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-panel-back]"),
  );
  const detailItems = Array.from(
    root.querySelectorAll<HTMLElement>("[data-detail-id]"),
  );

  // Each key here doubles as the `data-detail-field` value on the detail
  // panel's markup *and* the suffix of the `data-detail-*` attribute on
  // whichever list item was clicked (e.g. "distance" <-> data-detail-distance),
  // so a single loop can copy every field instead of one branch per field.
  const DETAIL_TEXT_FIELDS = [
    "title",
    "description",
    "distance",
    "time",
    "gain",
    "loss",
  ] as const;
  type DetailTextField = (typeof DETAIL_TEXT_FIELDS)[number];

  const detailTextFields: Partial<Record<DetailTextField, HTMLElement>> = {};
  DETAIL_TEXT_FIELDS.forEach((field) => {
    const el = root.querySelector<HTMLElement>(
      `[data-detail-field='${field}']`,
    );
    if (el) detailTextFields[field] = el;
  });
  const detailImageField = root.querySelector<HTMLImageElement>(
    "[data-detail-field='image']",
  );

  if (panels.length === 0) {
    return;
  }

  let returnPanel: RoutesPanelId = "tricity";

  function activatePanel(
    panelId: RoutesPanelId,
    options: ActivateOptions = {},
  ) {
    const {
      detailTitle,
      focus = true,
      updateHash = true,
      hashSuffix,
    } = options;

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== panelId;
    });

    triggers.forEach((trigger) => {
      const isActive = trigger.dataset.panelTarget === panelId;
      trigger.dataset.state = isActive ? "active" : "inactive";

      if (trigger.getAttribute("role") === "tab") {
        trigger.setAttribute("aria-selected", String(isActive));
        trigger.tabIndex = isActive ? 0 : -1;
      } else if (isActive) {
        trigger.setAttribute("aria-current", "page");
      } else {
        trigger.removeAttribute("aria-current");
      }
    });

    const label =
      panelId === "detail" ? (detailTitle ?? "Route") : PANEL_LABELS[panelId];
    breadcrumbSlots.forEach((slot) => {
      slot.textContent = label;
    });

    if (panelId !== "detail") {
      returnPanel = panelId;
    }
    document.body.dataset.prototypeActivePanel = panelId;
    document.body.dataset.prototypeReturnPanel = returnPanel;

    if (updateHash) {
      const hash = `#${panelId}${hashSuffix ? `-${hashSuffix}` : ""}`;
      if (location.hash !== hash) {
        history.pushState(null, "", hash);
      }
    }

    if (focus) {
      const activePanel = panels.find(
        (panel) => panel.dataset.panel === panelId,
      );
      const heading = activePanel?.querySelector<HTMLElement>(
        "[data-panel-heading]",
      );
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: false });
      }
    }

    // Panels can become visible after having 0 dimensions (hidden
    // attribute) or after a layout shift (e.g. a sidebar collapsing).
    // MapLibre only auto-resizes on window resize, so nudge it.
    window.dispatchEvent(new Event("resize"));
  }

  function openDetail(
    trigger: HTMLElement,
    options: { updateHash?: boolean } = {},
  ) {
    const { updateHash = true } = options;
    const sourcePanel = trigger.closest<HTMLElement>("[data-panel]")?.dataset
      .panel as RoutesPanelId | undefined;

    if (sourcePanel && sourcePanel !== "detail") {
      returnPanel = sourcePanel;
    }

    DETAIL_TEXT_FIELDS.forEach((field) => {
      const el = detailTextFields[field];
      if (!el) return;
      const datasetKey = `detail${field[0].toUpperCase()}${field.slice(1)}`;
      el.textContent = trigger.dataset[datasetKey] ?? "";
    });

    const title = trigger.dataset.detailTitle ?? "";

    if (detailImageField) {
      const src = trigger.dataset.detailImage;
      if (src) {
        detailImageField.src = src;
        detailImageField.hidden = false;
      } else {
        detailImageField.hidden = true;
      }
    }

    activatePanel("detail", {
      detailTitle: title,
      updateHash,
      hashSuffix: updateHash ? trigger.dataset.detailId : undefined,
    });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const target = trigger.dataset.panelTarget as RoutesPanelId | undefined;
      if (target) {
        activatePanel(target);
      }
    });
  });

  // WAI-ARIA APG roving-tabindex arrow key support for any `role="tab"`
  // trigger, grouped by its nearest `role="tablist"` ancestor. Applies to
  // every variant that models its subnav as tabs (routes1's tablist,
  // routes4's segmented control), at no extra cost to the others.
  const tabGroups = new Map<Element, HTMLElement[]>();
  triggers.forEach((trigger) => {
    if (trigger.getAttribute("role") !== "tab") return;
    const list = trigger.closest("[role='tablist']");
    if (!list) return;
    const group = tabGroups.get(list) ?? [];
    group.push(trigger);
    tabGroups.set(list, group);
  });

  tabGroups.forEach((tabs) => {
    tabs.forEach((tab, index) => {
      tab.addEventListener("keydown", (event) => {
        const key = event.key;
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;

        event.preventDefault();
        let nextIndex = index;
        if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (key === "ArrowLeft")
          nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (key === "Home") nextIndex = 0;
        if (key === "End") nextIndex = tabs.length - 1;

        const nextTab = tabs[nextIndex];
        nextTab.focus();
        nextTab.click();
      });
    });
  });

  detailItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      openDetail(item);
    });
  });

  backTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      activatePanel(returnPanel);
    });
  });

  window.addEventListener("popstate", () => {
    applyHash({ updateHash: false });
  });

  function applyHash(options: { updateHash?: boolean } = {}) {
    const hash = location.hash.replace(/^#/, "");
    // Route ids are themselves hyphenated (e.g. "samborowo-glowica"), so
    // only the *first* hyphen separates the panel id from a detail id.
    const separatorIndex = hash.indexOf("-");
    const panelId = (
      separatorIndex === -1 ? hash : hash.slice(0, separatorIndex)
    ) as RoutesPanelId | "";
    const detailId =
      separatorIndex === -1 ? undefined : hash.slice(separatorIndex + 1);

    if (panelId === "detail" && detailId) {
      const item = detailItems.find((el) => el.dataset.detailId === detailId);
      if (item) {
        openDetail(item, { updateHash: options.updateHash });
        return;
      }
    }

    if (panelId === "map" || panelId === "tricity" || panelId === "nearby") {
      activatePanel(panelId, { updateHash: options.updateHash, focus: false });
      return;
    }

    activatePanel("map", { updateHash: false, focus: false });
  }

  applyHash({ updateHash: false });
}
