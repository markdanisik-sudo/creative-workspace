import "server-only";
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { round2, type Invoice, type InvoiceLine, type Party } from "@/lib/invoice/types";
import { databasePath } from "./path";
import {
  StoreError,
  type BusinessRecord,
  type Contact,
  type ContactInput,
  type InvoiceRow,
  type InvoiceWrite,
  type Store,
} from "./types";

/** Schema versions, applied in order and recorded in PRAGMA user_version. */
const MIGRATIONS = [
  `
  create table business (
    id integer primary key check (id = 1),
    name text not null default '',
    street text, city text, zip text,
    country text not null default 'CZ',
    ico text, dic text, registry text,
    bank_account text, iban text, bic text,
    email text, phone text, web text,
    vat_payer integer not null default 0,
    due_days integer not null default 14,
    invoice_note text
  );

  create table contacts (
    id text primary key,
    name text not null,
    street text, city text, zip text,
    country text not null default 'CZ',
    ico text, dic text, email text, phone text,
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  create unique index contacts_ico on contacts (ico) where ico is not null;

  create table invoices (
    id text primary key,
    kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
    number text not null,
    variable_symbol text,
    issued_on text not null,
    taxable_on text,
    due_on text not null,
    paid_on text,
    currency text not null default 'CZK',
    exchange_rate real not null default 1,
    contact_id text references contacts (id) on delete set null,
    supplier text not null default '{}',
    customer text not null default '{}',
    items text not null default '[]',
    subtotal real not null default 0,
    vat real not null default 0,
    total real not null default 0,
    total_czk real generated always as (round(total * exchange_rate, 2)) stored,
    note text,
    source text not null default 'app',
    external_id text,
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  create unique index invoices_number on invoices (kind, number);
  create unique index invoices_external on invoices (external_id) where external_id is not null;
  create index invoices_issued on invoices (issued_on desc);
  `,
];

// One connection for the whole server process. (Each route is bundled
// separately, so a module-level variable would give each its own.)
const shared = globalThis as typeof globalThis & { __fakturyDatabase?: DatabaseSync };

export function openDatabase(): DatabaseSync {
  if (shared.__fakturyDatabase) return shared.__fakturyDatabase;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;");
  const version = Number(
    (db.prepare("pragma user_version").get() as { user_version: number }).user_version,
  );
  for (let index = version; index < MIGRATIONS.length; index++) {
    db.exec("begin");
    try {
      db.exec(MIGRATIONS[index]);
      db.exec(`pragma user_version = ${index + 1}`);
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
  }
  shared.__fakturyDatabase = db;
  return db;
}

type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

function rethrow(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/UNIQUE constraint failed/i.test(message)) throw new StoreError("23505", message);
  throw new StoreError("unknown", message);
}

function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("begin");
  try {
    const result = work();
    db.exec("commit");
    return result;
  } catch (error) {
    db.exec("rollback");
    rethrow(error);
  }
}

const text = (value: SqlValue) => (value === null ? null : String(value));

function toInvoice(row: Row): Invoice {
  return {
    id: String(row.id),
    kind: row.kind as Invoice["kind"],
    number: String(row.number),
    variable_symbol: text(row.variable_symbol),
    issued_on: String(row.issued_on),
    taxable_on: text(row.taxable_on),
    due_on: String(row.due_on),
    paid_on: text(row.paid_on),
    currency: String(row.currency),
    exchange_rate: Number(row.exchange_rate),
    contact_id: text(row.contact_id),
    supplier: JSON.parse(String(row.supplier)) as Party,
    customer: JSON.parse(String(row.customer)) as Party,
    items: JSON.parse(String(row.items)) as InvoiceLine[],
    subtotal: Number(row.subtotal),
    vat: Number(row.vat),
    total: Number(row.total),
    total_czk: round2(Number(row.total_czk)),
    note: text(row.note),
    source: row.source as Invoice["source"],
    external_id: text(row.external_id),
    created_at: String(row.created_at),
  };
}

const INVOICE_COLUMNS = [
  "kind",
  "number",
  "variable_symbol",
  "issued_on",
  "taxable_on",
  "due_on",
  "paid_on",
  "currency",
  "exchange_rate",
  "contact_id",
  "supplier",
  "customer",
  "items",
  "subtotal",
  "vat",
  "total",
  "note",
  "source",
  "external_id",
] as const;

function invoiceValues(invoice: Partial<InvoiceWrite>): Partial<Record<string, SqlValue>> {
  const values: Partial<Record<string, SqlValue>> = {};
  for (const column of INVOICE_COLUMNS) {
    if (!(column in invoice)) continue;
    const value = invoice[column];
    values[column] =
      value === undefined || value === null
        ? null
        : typeof value === "object"
          ? JSON.stringify(value)
          : (value as string | number);
  }
  return values;
}

const CONTACT_COLUMNS = [
  "name",
  "street",
  "city",
  "zip",
  "country",
  "ico",
  "dic",
  "email",
  "phone",
] as const;

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Data in a SQLite file on this computer (the desktop app). One business, no accounts. */
export function createLocalStore(): Store {
  const db = () => openDatabase();

  return {
    async getBusiness() {
      const row = db().prepare("select * from business where id = 1").get() as Row | undefined;
      if (!row) return null;
      const { id: _id, vat_payer, due_days, ...rest } = row;
      void _id;
      return {
        ...(rest as unknown as BusinessRecord),
        vat_payer: Boolean(vat_payer),
        due_days: Number(due_days),
      };
    },

    async saveBusiness(business) {
      const values: Record<string, SqlValue> = {
        ...(business as unknown as Record<string, SqlValue>),
        vat_payer: business.vat_payer ? 1 : 0,
      };
      const columns = Object.keys(values);
      try {
        db()
          .prepare(
            `insert into business (id, ${columns.join(", ")}) values (1, ${columns.map((c) => `:${c}`).join(", ")})
             on conflict (id) do update set ${columns.map((c) => `${c} = excluded.${c}`).join(", ")}`,
          )
          .run(values);
      } catch (error) {
        rethrow(error);
      }
    },

    async listContacts() {
      return db()
        .prepare(
          `select id, ${CONTACT_COLUMNS.join(", ")} from contacts order by name collate nocase`,
        )
        .all()
        .map((row) => ({ ...row }) as unknown as Contact);
    },

    async findContact(ico, name) {
      if (ico) {
        const row = db().prepare("select id from contacts where ico = ?").get(ico) as
          Row | undefined;
        return row ? String(row.id) : null;
      }
      const wanted = normalizeName(name);
      const rows = db().prepare("select id, name from contacts").all() as Row[];
      const match = rows.find((row) => normalizeName(String(row.name)) === wanted);
      return match ? String(match.id) : null;
    },

    async insertContact(contact: ContactInput) {
      const id = randomUUID();
      try {
        db()
          .prepare(
            `insert into contacts (id, ${CONTACT_COLUMNS.join(", ")}) values (:id, ${CONTACT_COLUMNS.map((c) => `:${c}`).join(", ")})`,
          )
          .run({ id, ...(contact as unknown as Record<string, SqlValue>) });
      } catch (error) {
        rethrow(error);
      }
      return id;
    },

    async updateContact(id, contact) {
      try {
        const result = db()
          .prepare(
            `update contacts set ${CONTACT_COLUMNS.map((c) => `${c} = :${c}`).join(", ")} where id = :id`,
          )
          .run({ id, ...(contact as unknown as Record<string, SqlValue>) });
        return Number(result.changes) > 0;
      } catch (error) {
        rethrow(error);
      }
    },

    async deleteContact(id) {
      return Number(db().prepare("delete from contacts where id = ?").run(id).changes) > 0;
    },

    async listInvoiceRows() {
      const rows = db()
        .prepare(
          `select id, kind, number, issued_on, due_on, paid_on, currency, total, total_czk, contact_id,
                  json_extract(customer, '$.name') as customer_name,
                  json_extract(customer, '$.ico') as customer_ico
           from invoices order by issued_on desc, number desc`,
        )
        .all() as Row[];
      return rows.map((row): InvoiceRow => ({
        id: String(row.id),
        kind: row.kind as InvoiceRow["kind"],
        number: String(row.number),
        issued_on: String(row.issued_on),
        due_on: String(row.due_on),
        paid_on: text(row.paid_on),
        currency: String(row.currency),
        total: Number(row.total),
        total_czk: round2(Number(row.total_czk)),
        customer_name: text(row.customer_name) || "—",
        customer_ico: text(row.customer_ico),
        contact_id: text(row.contact_id),
      }));
    },

    async getInvoice(id) {
      const row = db().prepare("select * from invoices where id = ?").get(id) as Row | undefined;
      return row ? toInvoice(row) : null;
    },

    async listInvoices(year) {
      const rows = (
        year
          ? db()
              .prepare(
                "select * from invoices where issued_on between ? and ? order by issued_on, number",
              )
              .all(`${year}-01-01`, `${year}-12-31`)
          : db().prepare("select * from invoices order by issued_on, number").all()
      ) as Row[];
      return rows.map(toInvoice);
    },

    async existingInvoices(numbers, externalIds) {
      const keys = new Set<string>();
      const external = new Set<string>();
      const byNumber = db().prepare(
        "select kind, number, external_id from invoices where number = ?",
      );
      for (const number of new Set(numbers)) {
        for (const row of byNumber.all(number) as Row[]) {
          keys.add(`${row.kind}|${row.number}`);
          if (row.external_id) external.add(String(row.external_id));
        }
      }
      const byExternal = db().prepare("select external_id from invoices where external_id = ?");
      for (const id of new Set(externalIds)) {
        if (byExternal.get(id)) external.add(id);
      }
      return { keys, external };
    },

    async insertInvoices(invoices) {
      const connection = db();
      return transaction(connection, () =>
        invoices.map((invoice) => {
          const id = randomUUID();
          const values = invoiceValues(invoice);
          const columns = Object.keys(values);
          connection
            .prepare(
              `insert into invoices (id, ${columns.join(", ")}) values (:id, ${columns.map((c) => `:${c}`).join(", ")})`,
            )
            .run({ id, ...(values as Record<string, SqlValue>) });
          return id;
        }),
      );
    },

    async updateInvoice(id, invoice) {
      const values = invoiceValues(invoice);
      const columns = Object.keys(values);
      if (columns.length === 0) return true;
      try {
        const result = db()
          .prepare(
            `update invoices set ${columns.map((c) => `${c} = :${c}`).join(", ")},
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = :id`,
          )
          .run({ id, ...(values as Record<string, SqlValue>) });
        return Number(result.changes) > 0;
      } catch (error) {
        rethrow(error);
      }
    },

    async deleteInvoice(id) {
      return Number(db().prepare("delete from invoices where id = ?").run(id).changes) > 0;
    },
  };
}

/** A consistent copy of the whole database, for backups. */
export function backupDatabase(target: string) {
  rmSync(target, { force: true });
  openDatabase().exec(`vacuum into '${target.replace(/'/g, "''")}'`);
}

/**
 * Replaces the database with a backup file, after checking it is one. The
 * current data is kept next to it as "….pred-obnovou" just in case.
 */
export function restoreDatabase(source: string) {
  const candidate = new DatabaseSync(source, { readOnly: true });
  try {
    const tables = new Set(
      (candidate.prepare("select name from sqlite_master where type = 'table'").all() as Row[]).map(
        (row) => String(row.name),
      ),
    );
    const version = Number(
      (candidate.prepare("pragma user_version").get() as { user_version: number }).user_version,
    );
    if (!["business", "contacts", "invoices"].every((name) => tables.has(name))) {
      throw new Error("not a backup");
    }
    if (version < 1 || version > MIGRATIONS.length) throw new Error("unknown version");
  } finally {
    candidate.close();
  }

  const path = databasePath();
  const current = openDatabase();
  const safety = `${path}.pred-obnovou`;
  rmSync(safety, { force: true });
  current.exec(`vacuum into '${safety.replace(/'/g, "''")}'`);
  current.close();
  shared.__fakturyDatabase = undefined;
  rmSync(`${path}-wal`, { force: true });
  rmSync(`${path}-shm`, { force: true });
  copyFileSync(source, path);
  openDatabase();
}
