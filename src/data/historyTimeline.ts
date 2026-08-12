// Shared with src/pages/history.astro and the History section of the
// single-scroll homepage (src/pages/index.astro) so both read from one
// source of truth.
export type TimelineEvent = {
  year: number;
  event: string;
  description?: string;
  label?: string;
  minor?: boolean;
};

export type TimelineEventProcessed = TimelineEvent & {
  duration: number;
};

// Turns a (possibly filtered) list of events into the shape <Timeline>
// renders: each item's `duration` is the gap to the *next item in the given
// list* (or to today's year for the last one), so passing a full-events list
// vs. a major-events-only list both produce internally consistent bar
// lengths — filtering first is enough, no separate "collapsed" variant of
// this function is needed.
export const processTimeline = (
  events: TimelineEvent[],
): TimelineEventProcessed[] =>
  events.map((item, index) => ({
    ...item,
    duration: (events[index + 1]?.year ?? new Date().getFullYear()) - item.year,
  }));

export const timelineConfig: TimelineEvent[] = [
  {
    year: 997,
    event: "First record of GYDDANYZC",
    label: "Mostly Pomerelian dukes",
  },
  {
    year: 1308,
    event: "Danzig massacre",
    label: "Teutonic Order",
    description:
      "Teutonic Order helped to relieve Danzing from a siege, but the ally quickly turned into an enemy and took over the city.",
  },
  {
    year: 1410,
    event: "Battle of Grunwald",
    description:
      "Danzig paid homage to Polish King, but returned to Teutonic control a couple months after",
    label: "Teutonic Order",
    minor: true,
  },
  {
    year: 1454,
    event: "Danzig rebellion",
    label: "Poland",
    description:
      "Danzig rebels against the Teutonic Order and soon after supports Polish king in the Thirteen Years' War.",
  },
  {
    year: 1793,
    event: "Second Partition of Poland",
    label: "Prussia",
    description:
      "The annexation of Polish territories by Russia and Prussia occurred as a result of the lost Russo-Polish war a year earlier. The citizens of Gdańsk tried to resist the new Prussian authorities, but they were quickly suppressed.",
  },
  {
    year: 1807,
    event: "Siege of Danzig",
    label: "Free City (Napoleonic)",
  },
  {
    year: 1814,
    event: "Siege of Danzig",
    label: "Prussia",
  },
  {
    year: 1871,
    event: "Unification of Germany",
    label: "Germany",
    minor: true,
  },
  {
    year: 1918,
    event: "Weimar Republic is established",
    label: "Weimar Republic",
    minor: true,
  },
  {
    year: 1920,
    event: "Treaty of Versailles",
    label: "Free City (Versailles)",
  },
  {
    year: 1939,
    event: "Invasion of Poland",
    label: "Nazi Germany",
  },
  {
    year: 1945,
    event: "Liberation of Danzig",
    label: "Poland",
  },
];
