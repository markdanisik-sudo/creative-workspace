import { NextResponse } from "next/server";
import { getInvoice } from "@/features/invoices/queries";
import { isUuid } from "@/lib/ids";
import { buildIsdoc } from "@/lib/isdoc/build";
import { isdocFileName } from "@/lib/isdoc/filename";
import { getCurrentUser } from "@/lib/supabase/server";

/** Downloads the invoice as ISDOC (for the accountant or accounting software). */
export async function GET(_: Request, { params }: RouteContext<"/faktury/[id]/isdoc">) {
  const { id } = await params;
  if (!(await getCurrentUser())) return new NextResponse("Unauthorized", { status: 401 });
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  const invoice = await getInvoice(id);
  if (!invoice) return new NextResponse("Not found", { status: 404 });
  const name = isdocFileName(invoice.number, invoice.kind);
  return new NextResponse(buildIsdoc(invoice), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
