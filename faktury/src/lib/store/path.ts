import { join } from "node:path";

/** Where the database file lives: FAKTURY_DB (the desktop app sets it), else ./.data. */
export function databasePath(): string {
  return process.env.FAKTURY_DB || join(process.cwd(), ".data", "faktury.sqlite");
}
