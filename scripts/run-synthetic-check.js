import { runSyntheticCheck } from "./synthetic-check.js";

const ok = await runSyntheticCheck();
if (!ok) {
  process.exitCode = 1;
}
