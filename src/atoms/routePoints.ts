import { atom } from "nanostores";

export const $routePoints = atom<number | null>(null);

export function resetPoint() {
  $routePoints.set(null);
}

export function setPoint(progress: number) {
  $routePoints.set(progress);
}
