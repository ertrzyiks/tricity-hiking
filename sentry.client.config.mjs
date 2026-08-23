import * as Sentry from "@sentry/astro";

// This site is static (no SSR adapter), so all runtime errors happen in the
// browser - there's no sentry.server.config.mjs to instrument. The DSN below
// isn't a secret (Sentry DSNs are meant to be public), so it's fine to embed
// directly in the client bundle.
Sentry.init({
  dsn: "https://1f8359b5a1e8345379a50862c4382c04@o4510291657883648.ingest.de.sentry.io/4511960577212496",
});
