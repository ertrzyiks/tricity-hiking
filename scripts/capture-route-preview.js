import puppeteer, { TimeoutError } from "puppeteer";
import fs from "fs";

const BASE_PATH = "src/content";
// HEADED=true opens a real, visible browser window instead of running
// headless - useful when a capture hangs/times out and you want to watch
// what the page is actually doing.
const HEADED = process.env.HEADED === "true";

// The dev server / map tiles can be slow enough on a cold start that a
// route's first attempt times out for reasons that have nothing to do with
// that route - retrying a few times before giving up avoids failing the
// whole run over transient slowness.
const MAX_ATTEMPTS = 5;

const list = fs.readdirSync(`${BASE_PATH}/routes`);
const routes = list.filter((name) => {
  return fs.statSync(`${BASE_PATH}/routes/${name}`).isDirectory();
});

async function captureRoutePreview({ page, route }) {
  console.log("Opening " + `http://localhost:4321/preview/${route}`);
  await page.goto(`http://localhost:4321/preview/${route}`);

  // waitForSelector actively waits (up to timeout) for the element to
  // appear - unlike page.$(), which just queries the DOM once, right now,
  // and returns null if the map hasn't mounted yet.
  await page.waitForSelector(".maplibregl-map", { timeout: 5_000 });

  await page.waitForNetworkIdle();

  const element = await page.$(".maplibregl-map");
  await element.screenshot({
    path: `${BASE_PATH}/routes/${route}/${route}.jpg`,
    type: "jpeg",
  });
}

function attachDiagnostics(page) {
  // Surface what's happening inside the page - console output, uncaught
  // JS errors, and failed network requests (e.g. a blocked/unreachable
  // MapTiler request) - since none of that shows up in this script's own
  // output otherwise, and a hung capture gives no other clue why.
  page.on("console", (msg) => {
    console.log(`  [browser:${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.error(`  [browser:pageerror] ${err}`);
  });
  page.on("requestfailed", (req) => {
    console.error(
      `  [browser:requestfailed] ${req.url()} - ${req.failure()?.errorText}`,
    );
  });
}

async function run() {
  const browser = await puppeteer.launch({ headless: !HEADED });

  const failedRoutes = [];

  for (const route of routes) {
    if (
      fs.existsSync(`${BASE_PATH}/routes/${route}/${route}.jpg`) &&
      !process.env.FORCE
    ) {
      console.log(`Skipping ${route}`);
      continue;
    }

    // A fresh page (tab) per route, closed right after capturing it (all
    // retry attempts included) - each route mounts a brand-new MapLibre GL
    // (WebGL) instance, and reusing one page/tab across dozens of routes can
    // exhaust Chromium's limited pool of live WebGL contexts (navigating
    // away with goto() doesn't reliably reclaim the previous route's context
    // right away). Once that pool fills up, a later route's map silently
    // never acquires a context and hangs forever waiting to load - a full
    // new browser per route would dodge it too, but at the cost of a whole
    // Chromium process launch per route for no extra benefit.
    const page = await browser.newPage();
    attachDiagnostics(page);

    let succeeded = false;
    let lastErr;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await captureRoutePreview({ page, route });
        succeeded = true;
      } catch (err) {
        lastErr = err;
        if (err instanceof TimeoutError && attempt < MAX_ATTEMPTS) {
          console.error(
            `Timed out capturing ${route} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying...`,
          );
        }
      }

      // Only a timeout is worth retrying - anything else (a page error, a
      // failed request) is unlikely to be transient, so fail fast instead
      // of burning through the remaining attempts.
      if (succeeded || !(lastErr instanceof TimeoutError)) {
        break;
      }
    }

    await page.close();

    if (!succeeded) {
      // Keep going on the rest of the routes instead of dying on the
      // first failure - and report everything that failed at the end so
      // one bad route doesn't hide errors from the others.
      console.error(`Failed to capture ${route}:`, lastErr.message);
      failedRoutes.push(route);
    }
  }

  await browser.close();

  if (failedRoutes.length > 0) {
    console.error(
      `\n${failedRoutes.length} route(s) failed: ${failedRoutes.join(", ")}`,
    );
    process.exitCode = 1;
  }
}

run();
