import { initSentry, runSyntheticCheck } from "./synthetic-check.js";

initSentry();

const ok = await runSyntheticCheck();
if (!ok) {
  process.exitCode = 1;
}
