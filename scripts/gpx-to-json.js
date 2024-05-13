import { gpx } from "@tmcw/togeojson";
import fs from "fs";
// node doesn't have xml parsing or a dom. use xmldom
import { DOMParser } from "@xmldom/xmldom";

const BASE_PATH = "src/content";

const convert = (name) => {
  const gpxFilePath = `${BASE_PATH}/routes/${name}/${name}.gpx`;

  if (!fs.existsSync(gpxFilePath)) {
    return;
  }

  const gpxFile = new DOMParser().parseFromString(
    fs.readFileSync(gpxFilePath, "utf8")
  );

  const converted = gpx(gpxFile);

  fs.writeFileSync(
    `${BASE_PATH}/geodata/${name}.json`,
    JSON.stringify(converted, null, 4)
  );
};

const list = fs.readdirSync(`${BASE_PATH}/routes`);

list.forEach((name) => {
  convert(name);
});
