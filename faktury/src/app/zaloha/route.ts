import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { isLocal } from "@/lib/mode";
import { todayIso } from "@/lib/invoice/types";
import { backupDatabase, restoreDatabase } from "@/lib/store/local";

/** Desktop app: download the whole database as one file. */
export async function GET() {
  if (!isLocal()) return new NextResponse("Not found", { status: 404 });
  const target = join(tmpdir(), `faktury-zaloha-${Date.now()}.sqlite`);
  backupDatabase(target);
  const bytes = await readFile(target);
  await rm(target, { force: true });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="faktury-zaloha-${todayIso()}.sqlite"`,
      "cache-control": "no-store",
    },
  });
}

/** Desktop app: replace the database with a backup file. */
export async function POST(request: NextRequest) {
  if (!isLocal()) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Vyber soubor se zálohou." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const target = join(tmpdir(), `faktury-obnova-${Date.now()}.sqlite`);
  await writeFile(target, bytes);
  try {
    restoreDatabase(target);
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json({ error: "Tohle není záloha Faktur." }, { status: 400 });
  } finally {
    await rm(target, { force: true });
  }
  return NextResponse.json({ ok: true });
}
