import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdminAction } from "@/lib/admin/session";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from "@/lib/admin/media-types";

/**
 * Token endpoint for browser → Vercel Blob uploads. Files go straight from the browser to Blob (no 4.5 MB function limit);
 * this route only decides WHO may upload, WHAT types and HOW big. Only signed-in admins get a token.
 */
const SAFE_PATH = /^media\/[A-Za-z0-9._-]{1,120}$/;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    // Asking for an upload token needs a signed-in admin. (Other event types are Vercel's own signed callbacks.)
    if (body.type === "blob.generate-client-token") {
      try {
        await requireAdminAction();
      } catch {
        return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
      }
    }
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdminAction();
        if (!SAFE_PATH.test(pathname)) throw new Error("Invalid file name.");
        const isVideo = /\.(mp4|webm)$/i.test(pathname);
        return {
          allowedContentTypes: isVideo ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("session")) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
    return Response.json({ error: "Upload not allowed." }, { status: 400 });
  }
}
