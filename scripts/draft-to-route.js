import fs from "fs";
import path from "path";
import { DOMParser } from "@xmldom/xmldom";

const BASE_PATH = "src/content";
const DRAFTS_PATH = `${BASE_PATH}/drafts`;
const ROUTES_PATH = `${BASE_PATH}/routes`;

/**
 * Extract route name from GPX file
 * @param {string} gpxFilePath - Path to the GPX file
 * @returns {string|null} - Route name or null if not found
 */
export const getRouteNameFromGpx = (gpxFilePath) => {
  try {
    const gpxContent = fs.readFileSync(gpxFilePath, "utf8");
    const gpxDoc = new DOMParser().parseFromString(gpxContent, "text/xml");

    // Try to get name from metadata first
    const metadataName = gpxDoc
      .getElementsByTagName("metadata")[0]
      ?.getElementsByTagName("name")[0]?.textContent;

    if (metadataName) {
      return metadataName.trim();
    }

    // Fallback to track name
    const trackName = gpxDoc
      .getElementsByTagName("trk")[0]
      ?.getElementsByTagName("name")[0]?.textContent;

    if (trackName) {
      return trackName.trim();
    }

    return null;
  } catch (error) {
    console.error(`Error reading GPX file ${gpxFilePath}:`, error.message);
    return null;
  }
};

/**
 * Convert route name to slug
 * @param {string} name - Route name
 * @returns {string} - URL-friendly slug
 */
export const nameToSlug = (name) => {
  return name
    .toLowerCase()
    .normalize("NFD") // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/ł/g, "l") // Handle Polish ł
    .replace(/[^\w\s-]/g, "") // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Trim hyphens from start and end
};

/**
 * Create basic MDX file for route
 * @param {string} routePath - Path to route folder
 * @param {string} routeName - Route name
 * @param {string} slug - Route slug
 */
const createMdxFile = (routePath, routeName, slug) => {
  const mdxContent = `---
title: ${routeName}
geojson: ${slug}
description: TODO
htmlDescription: TODO
tricity: true
draft: true
---

## Description

TODO: Add route description here
`;

  const mdxFilePath = path.join(routePath, `${slug}.mdx`);
  fs.writeFileSync(mdxFilePath, mdxContent);
  console.log(`  Created MDX file: ${mdxFilePath}`);
};

/**
 * Process a single draft file
 * @param {string} draftFileName - Name of the draft GPX file
 */
const processDraft = (draftFileName) => {
  const draftFilePath = path.join(DRAFTS_PATH, draftFileName);

  // Get route name from GPX
  const routeName = getRouteNameFromGpx(draftFilePath);
  if (!routeName) {
    console.error(`  ✗ Could not extract route name from ${draftFileName}`);
    return false;
  }

  console.log(`  Route name: "${routeName}"`);

  // Generate slug
  const slug = nameToSlug(routeName);
  console.log(`  Route slug: "${slug}"`);

  // Create route folder
  const routePath = path.join(ROUTES_PATH, slug);
  if (fs.existsSync(routePath)) {
    console.error(`  ✗ Route folder already exists: ${routePath}`);
    return false;
  }

  fs.mkdirSync(routePath, { recursive: true });
  console.log(`  Created folder: ${routePath}`);

  // Move GPX file to route folder
  const newGpxPath = path.join(routePath, `${slug}.gpx`);
  fs.copyFileSync(draftFilePath, newGpxPath);
  console.log(`  Copied GPX file to: ${newGpxPath}`);

  // Create MDX file
  createMdxFile(routePath, routeName, slug);

  console.log(`  ✓ Successfully created route: ${slug}`);
  return true;
};

/**
 * Main function
 */
const main = () => {
  console.log("Converting drafts to routes...\n");

  // Check if drafts folder exists
  if (!fs.existsSync(DRAFTS_PATH)) {
    console.error(`Drafts folder not found: ${DRAFTS_PATH}`);
    process.exit(1);
  }

  // Get list of GPX files from drafts folder
  const draftFiles = fs
    .readdirSync(DRAFTS_PATH)
    .filter((file) => file.endsWith(".gpx"));

  if (draftFiles.length === 0) {
    console.log("No draft files found.");
    return;
  }

  console.log(`Found ${draftFiles.length} draft file(s):\n`);

  let successCount = 0;
  let failureCount = 0;

  // Process each draft
  draftFiles.forEach((draftFile) => {
    console.log(`Processing: ${draftFile}`);
    const success = processDraft(draftFile);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    console.log();
  });

  // Summary
  console.log("Summary:");
  console.log(`  ✓ Successful: ${successCount}`);
  console.log(`  ✗ Failed: ${failureCount}`);

  if (successCount > 0) {
    console.log(
      '\nNext steps:\n  1. Run "pnpm run gpx2json" to generate JSON files from GPX files',
    );
    console.log(
      '  2. Run "pnpm run capture:preview" to generate preview images',
    );
    console.log("  3. Update the MDX files with proper descriptions");
  }
};

main();
