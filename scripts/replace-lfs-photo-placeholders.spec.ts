import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  isLfsPointerFile,
  replaceLfsPhotoPlaceholders,
} from "./replace-lfs-photo-placeholders.js";

// PR builds check out with `lfs: false` so LFS-tracked photos land as
// plain-text pointer files instead of real JPEGs (see ci.yml and
// .gitattributes). astro:assets' Image component runs those through sharp
// at build time, and sharp can't decode a text pointer - so an unpatched
// pointer file bricks the build. These tests pin down that pointer files
// get swapped for real, decodable JPEGs, and that real photos already
// checked out (the "lfs-" branch case) are left untouched.

const LFS_POINTER_CONTENT =
  "version https://git-lfs.github.com/spec/v1\noid sha256:abc123\nsize 12345\n";

const dirsToClean: string[] = [];

afterEach(async () => {
  await Promise.all(
    dirsToClean
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  dirsToClean.push(dir);
  return dir;
}

describe("isLfsPointerFile", () => {
  it("recognizes a git-lfs pointer file", async () => {
    const dir = await makeTempDir("photos-");
    const file = path.join(dir, "pointer.jpg");
    await writeFile(file, LFS_POINTER_CONTENT);

    expect(isLfsPointerFile(file)).toBe(true);
  });

  it("does not flag a real JPEG as a pointer", async () => {
    const dir = await makeTempDir("photos-");
    const file = path.join(dir, "real.jpg");
    const realJpeg = await sharp({
      create: { width: 4, height: 4, channels: 3, background: "red" },
    })
      .jpeg()
      .toBuffer();
    await writeFile(file, realJpeg);

    expect(isLfsPointerFile(file)).toBe(false);
  });
});

describe("replaceLfsPhotoPlaceholders", () => {
  it("replaces every LFS pointer photo with a decodable placeholder JPEG", async () => {
    const dir = await makeTempDir("photos-");
    const pointerA = path.join(dir, "a.jpg");
    const pointerB = path.join(dir, "b.jpg");
    await writeFile(pointerA, LFS_POINTER_CONTENT);
    await writeFile(pointerB, LFS_POINTER_CONTENT);

    const replaced = await replaceLfsPhotoPlaceholders(dir);

    expect(replaced.sort()).toEqual([pointerA, pointerB].sort());
    for (const file of [pointerA, pointerB]) {
      const contents = await readFile(file);
      const metadata = await sharp(contents).metadata();
      expect(metadata.format).toBe("jpeg");
    }
  });

  it("leaves already-real photos untouched", async () => {
    const dir = await makeTempDir("photos-");
    const file = path.join(dir, "real.jpg");
    const realJpeg = await sharp({
      create: { width: 4, height: 4, channels: 3, background: "blue" },
    })
      .jpeg()
      .toBuffer();
    await writeFile(file, realJpeg);

    const replaced = await replaceLfsPhotoPlaceholders(dir);

    expect(replaced).toEqual([]);
    await expect(readFile(file)).resolves.toEqual(realJpeg);
  });

  it("does nothing when the photos directory doesn't exist", async () => {
    const replaced = await replaceLfsPhotoPlaceholders(
      "/nonexistent/photos/dir",
    );
    expect(replaced).toEqual([]);
  });
});
