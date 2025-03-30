import { gpx } from "@tmcw/togeojson";
import fs from "fs";
// node doesn't have xml parsing or a dom. use xmldom
import { DOMParser } from "@xmldom/xmldom";
import { getRouteStats } from "./get-route-stats.js";

const BASE_PATH = "src/content";

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

const convert = (fileName) => {
  if (!fileName.endsWith(".mdx")) {
    return { result: "IGNORE" };
  }

  const name = fileName.replace(".mdx", "");
  const gpxFilePath = `${BASE_PATH}/routes/${name}.gpx`;

  if (!fs.existsSync(gpxFilePath)) {
    return { result: "Not found" };
  }

  const gpxFile = new DOMParser().parseFromString(
    fs.readFileSync(gpxFilePath, "utf8"),
  );

  const converted = gpx(gpxFile);
  const processed = process(name, converted);

  fs.writeFileSync(
    `${BASE_PATH}/geodata/${name}.json`,
    JSON.stringify(processed, null, 2),
  );

  return { result: "OK" };
};

const list = fs.readdirSync(`${BASE_PATH}/routes`);

list.forEach((name) => {
  const { result } = convert(name);

  if (result !== "IGNORE") {
    console.log(name, result);
  }
});
