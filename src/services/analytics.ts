export function trackEvent(
  eventName: string,
  eventData: Record<string, any> = {},
): void {
  console.log("Tracking event:", eventName, eventData);

  if (typeof window !== "undefined" && window.statsig) {
    window.statsig.logEvent(eventName, eventData);
  }
}
