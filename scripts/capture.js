import puppeteer from "puppeteer";

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:4321/tricity-hiking");

  await page.waitForSelector(".maplibregl-map", { timeout: 30_000 });

  await page.waitForNetworkIdle();

  const element = await page.$(".maplibregl-map");
  await element.screenshot({ path: "./src/assets/home-map.jpg", type: "jpeg" });
  browser.close();
}

run();
