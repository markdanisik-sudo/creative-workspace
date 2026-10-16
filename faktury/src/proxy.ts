import { NextResponse, type NextRequest } from "next/server";
import { isLocal } from "@/lib/mode";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Web: sign-in and two-factor checks. Desktop: the app's window carries a
 * secret cookie set by the Mac app, so nothing else on the computer (another
 * app, a web page in a browser) can talk to the local server.
 */
export async function proxy(request: NextRequest) {
  if (isLocal()) {
    const token = process.env.FAKTURY_LOCAL_TOKEN;
    if (token && request.cookies.get("faktury_token")?.value !== token) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (["/sign-in", "/sign-up", "/verify"].includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
