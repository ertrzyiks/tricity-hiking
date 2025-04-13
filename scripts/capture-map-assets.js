import puppeteer from "puppeteer";
import fs from "fs";

const BASE_PATH = "src/content";

const list = fs.readdirSync(`${BASE_PATH}/routes`);
const routes = list
  .filter((name) => name.endsWith(".mdx"))
  .map((name) => {
    return name.slice(0, -4);
  });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function captureMapAssets({ page, route }) {
  await page.goto(`http://localhost:4321${route}`);

  await page.waitForSelector(".maplibregl-map", { timeout: 30_000 });

  // await page.waitForNetworkIdle(); doesn't work with interception
  await wait(3_000);
}

function saveMapAssets(route, assetUrls) {
  const fileSignature = route.replaceAll("/", "");
  const mapAssetsFile = `${BASE_PATH}/map-tiles/${fileSignature}.json`;
  // if (fs.existsSync(mapAssetsFile)) {
  //   return;
  // }

  fs.writeFileSync(
    mapAssetsFile,
    JSON.stringify({ urls: Array.from(assetUrls) }, null, 2),
  );
}

async function run() {
  const browser = await puppeteer.launch({
    args: [`--window-size=1920,1080`],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    headless: true,
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  const routeAssets = new Map();
  let currentUrl = null;
  let assetUrls = null;

  const startCapture = (url) => {
    currentUrl = url;
    assetUrls = new Set();
  };
  const finishCapture = () => {
    const res = assetUrls;
    routeAssets.set(currentUrl, assetUrls);
    currentUrl = null;
    assetUrls = null;

    return res;
  };

  page.on("request", async (request) => {
    const url = request.url();
    if (url.startsWith("https://api.maptiler.com") && assetUrls) {
      assetUrls.add(url);
    }
    request.continue().catch(console.error);
  });

  const capture = async (url) => {
    startCapture(url);
    await captureMapAssets({ page, route: url });
    const capturedAssetUrls = finishCapture();
    saveMapAssets(url, capturedAssetUrls);
  };

  await capture("/routes/");

  // for (const route of routes) {
  //   if (fs.existsSync(`./src/assets/routes/${route}.jpg`)) {
  //     console.log(`Skipping ${route}`);
  //     continue;
  //   }

  //   await captureMapAssets({ page, route: `preview/${route}` });
  // }

  browser.close();
}

run();
