import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Company details from ARES (the Czech business register) by IČO, so a
 * customer or your own details fill in by themselves.
 */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ico = request.nextUrl.searchParams.get("ico")?.replace(/\s+/g, "") ?? "";
  if (!/^\d{6,8}$/.test(ico)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const response = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico.padStart(8, "0")}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 },
      },
    );
    if (response.status === 404) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!response.ok) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    const data = await response.json();
    const seat = data.sidlo ?? {};
    const number = [
      seat.cisloDomovni,
      seat.cisloOrientacni ? `${seat.cisloOrientacni}${seat.cisloOrientacniPismeno ?? ""}` : null,
    ]
      .filter(Boolean)
      .join("/");
    const streetName = seat.nazevUlice ?? seat.nazevCastiObce ?? seat.nazevObce ?? "";
    // "Praha 1" rather than just "Praha" where the register has it.
    const district: string | undefined = seat.nazevMestskeCastiObvodu;
    const city =
      district && seat.nazevObce && district.startsWith(seat.nazevObce) ? district : seat.nazevObce;
    return NextResponse.json({
      name: data.obchodniJmeno ?? "",
      ico: data.ico ?? ico,
      dic: data.dic ?? null,
      street: [streetName, number].filter(Boolean).join(" ") || null,
      city: city || null,
      zip: seat.psc ? String(seat.psc).replace(/^(\d{3})(\d{2})$/, "$1 $2") : null,
      country: seat.kodStatu === "CZ" || !seat.kodStatu ? "CZ" : seat.kodStatu,
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
