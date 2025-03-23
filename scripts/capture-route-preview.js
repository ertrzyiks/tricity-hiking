import puppeteer from "puppeteer";

const routes = [
  "dolina-elfow",
  "dolina-strzyzy",
  "elblag-bazantarnia-parasol",
  "lesnik-opera",
  "orlowo-bulwar",
  "samborowo-glowica",
  "sopot-wyscigi-to-kamienny-potok",
  "wejherowo-kalwaria",
];

async function captureRoutePreview({ page, route }) {
  await page.goto(`http://localhost:4321/preview/${route}`);

  await page.waitForSelector(".maplibregl-map", { timeout: 30_000 });

  await page.waitForNetworkIdle();

  const element = await page.$(".maplibregl-map");
  await element.screenshot({
    path: `./src/assets/routes/${route}.jpg`,
    type: "jpeg",
  });
}

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const route of routes) {
    await captureRoutePreview({ page, route });
  }

  browser.close();
}

run();
