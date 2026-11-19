import { NextResponse, type NextRequest } from "next/server";
import { isEntryPath } from "@/lib/admin/entry";
import { SESSION_COOKIE, verifyToken } from "@/lib/admin/token";

/**
 * First gate. It does not touch the database, so it is not the last gate: every admin page, server action and route
 * handler also checks the session itself (src/lib/admin/session.ts: requireAdmin / requireAdminAction).
 *
 * - The private sign-in address (/enter/<ADMIN_ENTRY>) shows the login page.
 * - Anyone WITHOUT a valid signed session who asks for anything else under /admin (including /admin/login) or /enter/... gets a plain 404,
 *   so typing /admin on the site reveals nothing.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isEntryPath(pathname)) {
    return pathname === "/admin/login" ? NextResponse.next() : NextResponse.rewrite(new URL("/admin/login", request.url));
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = !!token && (await verifyToken(token));
  if (signedIn && pathname.startsWith("/admin")) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
}

export const config = { matcher: ["/admin/:path*", "/enter/:path*"] };
