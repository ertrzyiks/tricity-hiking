import puppeteer from "puppeteer";
import fs from "fs";

const BASE_PATH = "src/content";

const list = fs.readdirSync(`${BASE_PATH}/routes`);
const routes = list.filter((name) => {
  return fs.statSync(`${BASE_PATH}/routes/${name}`).isDirectory();
});

async function captureRoutePreview({ page, route }) {
  await page.goto(`http://localhost:4321/preview/${route}`);

  await page.waitForSelector(".maplibregl-map", { timeout: 30_000 });

  await page.waitForNetworkIdle();

  const element = await page.$(".maplibregl-map");
  await element.screenshot({
    path: `${BASE_PATH}/routes/${route}/${route}.jpg`,
    type: "jpeg",
  });
}

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const route of routes) {
    if (fs.existsSync(`${BASE_PATH}/routes/${route}/${route}.jpg`)) {
      console.log(`Skipping ${route}`);
      continue;
    }

    await captureRoutePreview({ page, route });
  }

  browser.close();
}

run();
