import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { fetchPage, UnfurlError } from "@/lib/unfurl/fetch-page";
import { parseLinkMetadata } from "@/lib/unfurl/parse";
import { logError } from "@/lib/errors";

const CACHE_SECONDS = 60 * 60 * 24;

/** Link preview metadata for bookmark cards. Signed-in users only. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = request.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const page = await fetchPage(target);
    const metadata = parseLinkMetadata(page.html, page.url);
    return NextResponse.json(metadata, {
      headers: { "cache-control": `private, max-age=${CACHE_SECONDS}` },
    });
  } catch (error) {
    // Failure is normal (many sites block previews); the client falls back to a plain card.
    if (!(error instanceof UnfurlError)) logError("unfurl", error, { target });
    return new NextResponse(null, { status: 204 });
  }
}
