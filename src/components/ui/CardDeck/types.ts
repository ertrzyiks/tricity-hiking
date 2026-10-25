export interface DeckCard {
  slug: string;
  title: string;
  description: string;
  previewSrc: string | null;
  distanceKm: number;
  time: string;
  totalGain: number;
  totalLoss: number;
}
