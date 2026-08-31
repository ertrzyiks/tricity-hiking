import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// PR builds check out with `lfs: false` (see .github/workflows/ci.yml) so
// they don't spend LFS bandwidth/quota on every push. That leaves the
// LFS-tracked photos under src/assets/photos as plain-text pointer files
// (see .gitattributes), which astro:assets' Image component can't decode -
// it'll throw trying to run sharp over a pointer file, not an actual JPEG.
// This swaps each pointer file for a same-name placeholder JPEG so the
// build has something real to process. Branches whose name starts with
// "lfs-" check out real LFS content instead and skip this entirely.

export const DEFAULT_PHOTOS_DIR = "src/assets/photos";
const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec/v1";

export function isLfsPointerFile(filePath) {
  const buffer = Buffer.alloc(LFS_POINTER_PREFIX.length);
  const fd = fs.openSync(filePath, "r");
  let bytesRead;
  try {
    bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  return buffer.subarray(0, bytesRead).toString("utf8") === LFS_POINTER_PREFIX;
}

function createPlaceholderJpeg() {
  return sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 210, g: 210, b: 210 },
    },
  })
    .jpeg()
    .toBuffer();
}

export async function replaceLfsPhotoPlaceholders(
  photosDir = DEFAULT_PHOTOS_DIR,
) {
  if (!fs.existsSync(photosDir)) {
    return [];
  }

  const pointerFiles = fs
    .readdirSync(photosDir)
    .filter((file) => file.endsWith(".jpg"))
    .map((file) => path.join(photosDir, file))
    .filter(isLfsPointerFile);

  if (pointerFiles.length === 0) {
    return [];
  }

  const placeholder = await createPlaceholderJpeg();
  for (const filePath of pointerFiles) {
    fs.writeFileSync(filePath, placeholder);
  }

  return pointerFiles;
}

async function main() {
  const replaced = await replaceLfsPhotoPlaceholders();
  console.log(
    replaced.length > 0
      ? `Replaced ${replaced.length} LFS pointer photo(s) with placeholders:\n${replaced.map((f) => `  ${f}`).join("\n")}`
      : `No LFS pointer photos found in ${DEFAULT_PHOTOS_DIR} (real images already checked out).`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
