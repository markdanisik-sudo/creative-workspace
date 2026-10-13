import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { devAutoSignInEnabled, devSignIn } from "./dev-sign-in";
import { supabaseKey, supabaseUrl } from "./env";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth", "/invite"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Refreshes the auth session cookie and redirects signed-out visitors. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between client creation and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  let isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  // Local development without a password (see dev-sign-in.ts). The invite
  // page is left alone so the client flow can still be tried out.
  if (
    !isSignedIn &&
    devAutoSignInEnabled() &&
    !pathname.startsWith("/invite") &&
    !pathname.startsWith("/api/")
  ) {
    isSignedIn = await devSignIn(supabase);
  }

  if (!isSignedIn && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return redirectWithCookies(url, response);
  }

  if (isSignedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
