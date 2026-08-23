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
 * Uses the HTTP check-in API:
 * https://docs.sentry.io/product/crons/getting-started/http/
 *
 * That endpoint has no real auth beyond the DSN's public key - which isn't a
 * secret (it already ships in the site's own JS bundle) - so anyone who can
 * read it can spoof a `status=error` check-in and page the team. Two
 * mitigations, since there's no stronger credential Sentry offers for
 * *creating* a check-in:
 *
 *   - The monitor slug (the other piece needed to construct the check-in
 *     URL) is a GitHub secret rather than committed, so it isn't sitting in
 *     the public repo.
 *   - `failure_issue_threshold` below means a single spoofed request can't
 *     trigger an alert by itself.
 */

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

export function checkInUrl() {
  return `https://${SENTRY_INGEST_HOST}/api/${SENTRY_PROJECT_ID}/cron/${monitorSlug()}/${SENTRY_PUBLIC_KEY}/`;
}

export function buildCheckInPayload(status, checkInId) {
  return {
    status,
    check_in_id: checkInId,
    monitor_config: {
      schedule: { type: "crontab", value: CRON_SCHEDULE },
      timezone: "UTC",
      // Runs are a couple of fast HTTP requests; a few minutes of grace on
      // either side is generous, not tight.
      checkin_margin: 5,
      max_runtime: 5,
      // Require 2 consecutive failures before Sentry raises an alert, so a
      // single spoofed check-in (see module comment) can't page anyone, and
      // one flaky run doesn't either.
      failure_issue_threshold: 2,
      recovery_threshold: 1,
    },
  };
}

export async function sendCheckIn(status, checkInId, fetchImpl = fetch) {
  const response = await fetchImpl(checkInUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCheckInPayload(status, checkInId)),
  });

  if (!response.ok) {
    // A Sentry hiccup shouldn't mask (or fail) the actual synthetic check.
    console.error(
      `Sentry check-in (${status}) failed: ${response.status} ${await response.text()}`,
    );
  }
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
  const checkInId = crypto.randomUUID();
  await sendCheckIn("in_progress", checkInId, fetchImpl);

  try {
    for (const check of checks) {
      const durationMs = await runCheck(check, fetchImpl);
      log(`✓ ${check.name} (${durationMs}ms)`);
    }
  } catch (error) {
    logError(error.message);
    await sendCheckIn("error", checkInId, fetchImpl);
    return false;
  }

  await sendCheckIn("ok", checkInId, fetchImpl);
  return true;
}
