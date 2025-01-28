import { gpx } from "@tmcw/togeojson";
import fs from "fs";
// node doesn't have xml parsing or a dom. use xmldom
import { DOMParser } from "@xmldom/xmldom";

const BASE_PATH = "src/content";

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getDistanceBetweenPoints(lat1, lng1, lat2, lng2) {
  // The radius of the planet earth in meters
  let R = 6378137;
  let dLat = degreesToRadians(lat2 - lat1);
  let dLong = degreesToRadians(lng2 - lng1);
  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat1)) *
      Math.sin(dLong / 2) *
      Math.sin(dLong / 2);

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;

  return distance;
}

const getTotalDistance = (coords) => {
  const { total: distance } = coords.reduce(
    (acc, current) => {
      if (acc.last) {
        acc.total += getDistanceBetweenPoints(
          acc.last[1],
          acc.last[0],
          current[1],
          current[0],
        );
      }

      acc.last = current;
      return acc;
    },
    { last: null, total: 0 },
  );

  return distance;
};

const getTotalGainAndLoss = (coords) => {
  const { totalGain, totalLoss } = coords.reduce(
    (acc, current) => {
      if (acc.last) {
        const diff = current[2] - acc.last[2];
        if (diff > 0) {
          acc.totalGain += diff;
        } else {
          acc.totalLoss += Math.abs(diff);
        }
      }

      acc.last = current;
      return acc;
    },
    { last: null, totalGain: 0, totalLoss: 0 },
  );

  return { totalGain, totalLoss };
};

const process = (name, json) => {
  json.features.forEach((feature) => {
    if (feature.geometry.type !== "LineString") {
      return;
    }

    const distance = getTotalDistance(feature.geometry.coordinates);

    const { totalGain, totalLoss } = getTotalGainAndLoss(
      feature.geometry.coordinates,
    );

    feature.properties.distance = distance;
    feature.properties.totalGain = totalGain;
    feature.properties.totalLoss = totalLoss;
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
