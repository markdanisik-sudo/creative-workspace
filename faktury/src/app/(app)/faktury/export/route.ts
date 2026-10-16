import { strToU8, zipSync } from "fflate";
import { NextResponse, type NextRequest } from "next/server";
import { listInvoices } from "@/features/invoices/queries";
import { buildIsdoc } from "@/lib/isdoc/build";
import { isdocFileName } from "@/lib/isdoc/filename";
import { getCurrentUser } from "@/lib/supabase/server";

/** Every invoice of a year (or all) as ISDOC files in one ZIP, for the accountant. */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });
  const param = request.nextUrl.searchParams.get("rok");
  const year = param && /^\d{4}$/.test(param) ? param : null;
  const files: Record<string, Uint8Array> = {};
  for (const invoice of await listInvoices(year ? Number(year) : null)) {
    let name = isdocFileName(invoice.number, invoice.kind);
    while (files[name]) name = name.replace(/\.isdoc$/, "-1.isdoc");
    files[name] = strToU8(buildIsdoc(invoice));
  }
  const zip = zipSync(files, { level: 6 });
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="faktury-isdoc-${year ?? "vse"}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
