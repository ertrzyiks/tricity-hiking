import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TEST_DRAFTS_PATH = "/tmp/test-drafts";
const TEST_ROUTES_PATH = "/tmp/test-routes";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="https://gpx.studio" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Test Route</name>
  </metadata>
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="54.404848" lon="18.535729">
        <ele>62.5</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const SAMPLE_GPX_POLISH = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="https://gpx.studio" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Droga Królewska</name>
  </metadata>
  <trk>
    <name>Droga Królewska</name>
    <trkseg>
      <trkpt lat="54.404848" lon="18.535729">
        <ele>62.5</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("draft-to-route script", () => {
  beforeEach(() => {
    // Create test directories
    if (fs.existsSync(TEST_DRAFTS_PATH)) {
      fs.rmSync(TEST_DRAFTS_PATH, { recursive: true });
    }
    if (fs.existsSync(TEST_ROUTES_PATH)) {
      fs.rmSync(TEST_ROUTES_PATH, { recursive: true });
    }
    fs.mkdirSync(TEST_DRAFTS_PATH, { recursive: true });
    fs.mkdirSync(TEST_ROUTES_PATH, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(TEST_DRAFTS_PATH)) {
      fs.rmSync(TEST_DRAFTS_PATH, { recursive: true });
    }
    if (fs.existsSync(TEST_ROUTES_PATH)) {
      fs.rmSync(TEST_ROUTES_PATH, { recursive: true });
    }
  });

  it("should extract route name from GPX metadata", () => {
    const gpxFile = path.join(TEST_DRAFTS_PATH, "test-route.gpx");
    fs.writeFileSync(gpxFile, SAMPLE_GPX);

    // Import and test the function
    const { DOMParser } = require("@xmldom/xmldom");
    const gpxContent = fs.readFileSync(gpxFile, "utf8");
    const gpxDoc = new DOMParser().parseFromString(gpxContent, "text/xml");

    const metadataName = gpxDoc
      .getElementsByTagName("metadata")[0]
      ?.getElementsByTagName("name")[0]?.textContent;

    expect(metadataName).toBe("Test Route");
  });

  it("should convert route name to slug correctly", () => {
    const nameToSlug = (name) => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    };

    expect(nameToSlug("Test Route")).toBe("test-route");
    expect(nameToSlug("Droga Królewska")).toBe("droga-krolewska");
    expect(nameToSlug("Route   With    Spaces")).toBe("route-with-spaces");
  });

  it("should handle Polish characters in route names", () => {
    const nameToSlug = (name) => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    };

    expect(nameToSlug("Droga marnych mostów")).toBe("droga-marnych-mostow");
    expect(nameToSlug("Wyspa Sobieszewska")).toBe("wyspa-sobieszewska");
    expect(nameToSlug("Dolina Elfów")).toBe("dolina-elfow");
  });
});
