import { gpx } from "@tmcw/togeojson";
import fs from "fs";
// node doesn't have xml parsing or a dom. use xmldom
import { DOMParser } from "@xmldom/xmldom";
import { getRouteStats } from "./get-route-stats.js";

const BASE_PATH = "src/content";

const getRouteTitle = (name) => {
  const filepath = `${BASE_PATH}/routes/${name}/${name}.mdx`;
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const content = fs.readFileSync(filepath, "utf8").toString();

  const title = content.match(/title: (.*)/)[1];
  return title.trim();
};

const estimateTime = (distance, totalGain) => {
  const speed = 5000;
  return distance / speed + (totalGain / 500) * 0.5;
};

const prefixKeys = (obj, prefix) => {
  const prefixedObj = {};
  Object.keys(obj).forEach((key) => {
    const newKey = `${prefix}${key}`;
    prefixedObj[newKey] = obj[key];
  });
  return prefixedObj;
};

const parseDescPayload = (filename, desc) => {
  try {
    const payload = JSON.parse(desc);
    return prefixKeys(payload, "desc:");
  } catch (e) {
    console.error(`Error parsing ${filename} desc payload`, e);
    return {};
  }
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

const convert = ({ name, input, output }) => {
  if (!fs.existsSync(input)) {
    return { result: "Not found" };
  }

  const gpxFile = new DOMParser().parseFromString(
    fs.readFileSync(input, "utf8"),
  );

  const converted = gpx(gpxFile);
  const processed = process(name, converted);

  const feature = processed.features[0];
  if (feature.type === "Feature") {
    const routeTitle = getRouteTitle(name);

    if (routeTitle) {
      feature.properties.name = routeTitle;
    }
  }

  processed.features = processed.features.map((feature) => {
    if (feature.properties.desc) {
      const payload = parseDescPayload(name, feature.properties.desc);
      if (payload) {
        feature.properties = {
          ...feature.properties,
          ...payload,
        };
      }
    }
    return feature;
  });

  fs.writeFileSync(output, JSON.stringify(processed, null, 2));

  return { result: "OK" };
};

const list = fs.readdirSync(`${BASE_PATH}/routes`);

list.forEach((name) => {
  if (!fs.statSync(`${BASE_PATH}/routes/${name}`).isDirectory()) {
    return;
  }

  const { result } = convert({
    input: `${BASE_PATH}/routes/${name}/${name}.gpx`,
    output: `${BASE_PATH}/routes/${name}/${name}.json`,
    name,
  });

  if (result !== "IGNORE") {
    console.log(name, result);
  }
});

const list2 = fs.readdirSync(`${BASE_PATH}/transportation`);

list2.forEach((name) => {
  if (fs.statSync(`${BASE_PATH}/transportation/${name}`).isDirectory()) {
    return;
  }

  const fileName = name.split(".").slice(0, -1).join(".");

  const { result } = convert({
    input: `${BASE_PATH}/transportation/${fileName}.gpx`,
    output: `${BASE_PATH}/transportation/${fileName}.json`,
    name: fileName,
  });

  if (result !== "IGNORE") {
    console.log(name, result);
  }
});
