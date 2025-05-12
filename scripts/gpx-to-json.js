import { gpx } from "@tmcw/togeojson";
import fs from "fs";
// node doesn't have xml parsing or a dom. use xmldom
import { DOMParser } from "@xmldom/xmldom";
import { getRouteStats } from "./get-route-stats.js";

const BASE_PATH = "src/content";

const getRouteTitle = (name) => {
  const content = fs
    .readFileSync(`${BASE_PATH}/routes/${name}/${name}.mdx`, "utf8")
    .toString();

  const title = content.match(/title: (.*)/)[1];
  return title.trim();
};

const estimateTime = (distance, totalGain) => {
  const speed = 5000;
  return distance / speed + (totalGain / 500) * 0.5;
};

const process = (name, json) => {
  json.features.forEach((feature) => {
    if (feature.geometry.type !== "LineString") {
      return;
    }

    const { distance, totalGain, totalLoss } = getRouteStats(
      feature.geometry.coordinates,
    );

    const estimatedTime = estimateTime(distance, totalGain) * 60;

    feature.properties.distance = distance;
    feature.properties.totalGain = totalGain;
    feature.properties.totalLoss = totalLoss;
    feature.properties.estimatedTime = estimatedTime;
    feature.properties.routeSlug = name;
    delete feature.properties.coordinateProperties.times;

    const surfaces = feature.properties.coordinateProperties.Extensionss.map(
      (surface) => {
        return surface ? surface.trim() : null;
      },
    );

    delete feature.properties.coordinateProperties.Extensionss;
    feature.properties.coordinateProperties.surfaces = surfaces;
  });
  return json;
};

const convert = (name) => {
  const gpxFilePath = `${BASE_PATH}/routes/${name}/${name}.gpx`;

  if (!fs.existsSync(gpxFilePath)) {
    return { result: "Not found" };
  }

  const gpxFile = new DOMParser().parseFromString(
    fs.readFileSync(gpxFilePath, "utf8"),
  );

  const converted = gpx(gpxFile);
  const processed = process(name, converted);

  const feature = processed.features[0];
  if (feature.type === "Feature") {
    feature.properties.name = getRouteTitle(name);
  }

  fs.writeFileSync(
    `${BASE_PATH}/routes/${name}/${name}.json`,
    JSON.stringify(processed, null, 2),
  );

  return { result: "OK" };
};

const list = fs.readdirSync(`${BASE_PATH}/routes`);

list.forEach((name) => {
  if (!fs.statSync(`${BASE_PATH}/routes/${name}`).isDirectory()) {
    return;
  }

  const { result } = convert(name);

  if (result !== "IGNORE") {
    console.log(name, result);
  }
});
