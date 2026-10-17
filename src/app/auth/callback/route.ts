import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { siteOrigin } from "@/lib/site";

/** Completes email-link sign-in (confirmation, magic link) by exchanging the code. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // The address the browser used (not the server's idea of it), so the
  // session cookies set here are the ones it sends next.
  const origin = await siteOrigin();
  const code = searchParams.get("code");
  // Where to continue (e.g. the invitation the account was created for); same-origin paths only.
  const nextParam = searchParams.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/projects";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A password-reset link always continues to "set a new password".
      const claims = (await supabase.auth.getClaims()).data?.claims;
      const methods = Array.isArray(claims?.amr)
        ? claims.amr.map((entry: { method?: string }) => entry?.method)
        : [];
      const recovery = methods.includes("recovery");
      return NextResponse.redirect(`${origin}${recovery ? "/reset-password" : next}`);
    }
    logError("auth.callback", error);
  }

  return NextResponse.redirect(`${origin}/sign-in?link-expired=1`);
}
