export function trackEvent(
  eventName: string,
  eventData: Record<string, any> = {},
): void {
  if (import.meta.env.MODE === "development") {
    // In development mode, we log the event to the console instead of sending it to Statsig
    console.log("Tracking event", eventName, eventData);
  }

  if (typeof window !== "undefined" && window.statsig) {
    window.statsig.logEvent(eventName, eventData);
  }
}
