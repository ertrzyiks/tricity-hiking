export function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  // round to the nearest 5 minutes
  const mins = Math.round((minutes % 60) / 5) * 5;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}
