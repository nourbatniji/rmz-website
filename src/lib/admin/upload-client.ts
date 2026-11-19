"use client";

import { upload } from "@vercel/blob/client";
import { registerMedia } from "./media-actions";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES, type MediaRecord } from "./media-types";

function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (file.type === "image/svg+xml") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function videoSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth, height: v.videoHeight });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    v.src = url;
  });
}

/** Validate, upload straight to Blob, and add the file to the media library. Throws an Error with a readable message. */
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<MediaRecord> {
  const isVideo = VIDEO_TYPES.includes(file.type);
  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isVideo && !isImage) throw new Error(`${file.name}: use WebP, JPG, PNG, SVG, AVIF, GIF, MP4 or WebM.`);
  if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
    throw new Error(`${file.name} is too large (max ${isVideo ? "100" : "10"} MB).`);
  }
  const dims = isVideo ? await videoSize(file) : await imageSize(file);
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "") || "file";
  let blob;
  try {
    blob = await upload(`media/${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/media/upload",
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
  } catch (e) {
    throw new Error(e instanceof Error && e.message ? `Upload failed: ${e.message}` : "Upload failed. Check BLOB_READ_WRITE_TOKEN and try again.");
  }
  return registerMedia({
    url: blob.url,
    pathname: blob.pathname,
    mime: file.type,
    bytes: file.size,
    kind: isVideo ? "video" : "image",
    width: dims?.width ?? null,
    height: dims?.height ?? null,
  });
}

/** Natural filename sort so frame-2 comes before frame-10. */
export function naturalSort(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}
