/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { StatsigClient } from "statsig-js";

declare global {
  interface Window {
    statsig?: any;
  }
}
