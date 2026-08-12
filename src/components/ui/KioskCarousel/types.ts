export interface KioskRoute {
  slug: string;
  title: string;
  previewSrc: string | null;
  distanceKm: number;
  time: string;
  totalGain: number;
  totalLoss: number;
  summary: string;
}
