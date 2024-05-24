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

const process = (json) => {
  json.features.forEach((feature) => {
    if (feature.geometry.type !== "LineString") {
      return;
    }

    const { total: distance } = feature.geometry.coordinates.reduce(
      (acc, current) => {
        if (acc.last) {
          acc.total += getDistanceBetweenPoints(
            acc.last[1],
            acc.last[0],
            current[1],
            current[0]
          );
        }

        acc.last = current;
        return acc;
      },
      { last: null, total: 0 }
    );

    feature.properties.distance = distance;
  });
  return json;
};

const convert = (name) => {
  const gpxFilePath = `${BASE_PATH}/routes/${name}/${name}.gpx`;

  if (!fs.existsSync(gpxFilePath)) {
    return;
  }

  const gpxFile = new DOMParser().parseFromString(
    fs.readFileSync(gpxFilePath, "utf8")
  );

  const converted = gpx(gpxFile);
  const processed = process(converted);

  fs.writeFileSync(
    `${BASE_PATH}/geodata/${name}.json`,
    JSON.stringify(processed, null, 2)
  );
};

const list = fs.readdirSync(`${BASE_PATH}/routes`);

list.forEach((name) => {
  convert(name);
});
