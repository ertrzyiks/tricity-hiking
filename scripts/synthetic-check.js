/**
 * Synthetic uptime check for the live site, reported to Sentry as a Cron
 * Monitor check-in (see run-synthetic-check.js, invoked on a schedule by
 * .github/workflows/synthetic-check.yml).
 *
 * Cron Monitoring (rather than a custom metric) is what actually catches the
 * failure mode this exists for: not just "the site returned an error", but
 * "the check never ran or never finished" (GitHub's cron schedule got
 * skipped, the runner died, DNS is broken, etc). A missed check-in alerts on
 * its own; a metric that's never emitted can't.
 *
 * Uses `Sentry.withMonitor()` from the SDK - it wraps the check, sending an
 * `in_progress` check-in before it runs and `ok`/`error` after, based on
 * whether the callback throws:
 * https://docs.sentry.io/platforms/javascript/guides/node/crons/
 *
 * Auth for check-ins is just the DSN's public key, which isn't a secret (it
 * already ships in the site's own JS bundle) - so anyone who can read it
 * could spoof a `status=error` check-in and page the team. Two mitigations,
 * since there's no stronger credential Sentry offers for *creating* a
 * check-in:
 *
 *   - The monitor slug (the other piece needed to address a check-in) is a
 *     GitHub secret rather than committed, so it isn't sitting in the public
 *     repo.
 *   - `failureIssueThreshold` below means a single spoofed request can't
 *     trigger an alert by itself.
 */

import * as Sentry from "@sentry/node";

const SENTRY_INGEST_HOST = "o4510291657883648.ingest.de.sentry.io";
const SENTRY_PROJECT_ID = "4511960577212496";
const SENTRY_PUBLIC_KEY = "1f8359b5a1e8345379a50862c4382c04";

// Keep this in sync with the `schedule` in synthetic-check.yml - it's what
// Sentry uses to know when a check-in is "late" and alert on a missed run.
const CRON_SCHEDULE = "*/30 * * * *";

const SITE_ORIGIN = "https://tricity-hiking.ertrzyiks.me";
export const CHECKS = [
  { name: "homepage", url: `${SITE_ORIGIN}/` },
  // Exercises a route detail page, which renders a maplibre-gl map - the
  // component most likely to silently break (see the maplibre-gl v6 worker
  // loading fix).
  { name: "route page", url: `${SITE_ORIGIN}/routes/sobieszewo/` },
];
export const MIN_BODY_LENGTH = 500;

function monitorSlug() {
  const slug = process.env.SENTRY_MONITOR_SLUG;
  if (!slug) {
    throw new Error(
      "SENTRY_MONITOR_SLUG is not set - it's the SENTRY_MONITOR_SLUG GitHub secret, deliberately kept out of the repo (see the module comment above).",
    );
  }
  return slug;
}

export function initSentry() {
  Sentry.init({
    dsn: `https://${SENTRY_PUBLIC_KEY}@${SENTRY_INGEST_HOST}/${SENTRY_PROJECT_ID}`,
    // This script only reports Crons check-ins, not errors or traces - skip
    // the default integrations (http instrumentation, etc.) and the ESM
    // loader hooks that auto-instrumentation needs, since there's nothing
    // here for either to instrument.
    defaultIntegrations: false,
    registerEsmLoaderHooks: false,
  });
}

export function monitorConfig() {
  return {
    schedule: { type: "crontab", value: CRON_SCHEDULE },
    timezone: "UTC",
    // Runs are a couple of fast HTTP requests; a few minutes of grace on
    // either side is generous, not tight.
    checkinMargin: 5,
    maxRuntime: 5,
    // Require 2 consecutive failures before Sentry raises an alert, so a
    // single spoofed check-in (see module comment) can't page anyone, and
    // one flaky run doesn't either.
    failureIssueThreshold: 2,
    recoveryThreshold: 1,
  };
}

export async function runCheck(check, fetchImpl = fetch) {
  const startedAt = Date.now();
  const response = await fetchImpl(check.url, { redirect: "follow" });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    throw new Error(`${check.name}: ${check.url} responded ${response.status}`);
  }

  const body = await response.text();
  if (body.length < MIN_BODY_LENGTH) {
    throw new Error(
      `${check.name}: ${check.url} returned a suspiciously short body (${body.length} bytes)`,
    );
  }

  return durationMs;
}

export async function runSyntheticCheck({
  checks = CHECKS,
  fetchImpl = fetch,
  log = console.log,
  logError = console.error,
} = {}) {
  try {
    await Sentry.withMonitor(
      monitorSlug(),
      async () => {
        for (const check of checks) {
          const durationMs = await runCheck(check, fetchImpl);
          log(`✓ ${check.name} (${durationMs}ms)`);
        }
      },
      monitorConfig(),
    );
  } catch (error) {
    logError(error.message);
    return false;
  } finally {
    // A short-lived script like this one exits as soon as the check is done
    // - flush so the check-in envelopes actually make it out over the
    // network first, instead of getting dropped when the process exits.
    await Sentry.flush(2000);
  }

  return true;
}
