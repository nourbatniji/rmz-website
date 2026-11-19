/** Client-safe media types and limits. */
export type MediaRecord = {
  id: string;
  url: string;
  pathname: string;
  kind: "image" | "video";
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
};

export const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png", "image/svg+xml", "image/avif", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
