import QRCode from "qrcode";
import { formatDate, formatMoney } from "@/lib/format";
import { lineTotals, partyAddressLines, type Invoice, type Party } from "@/lib/invoice/types";
import { formatIban, payableIban, spaydString } from "@/lib/payment";

function PartyBlock({ title, party }: { title: string; party: Party }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="mb-1 text-[11px] font-semibold tracking-wide text-[#77766f] uppercase">
        {title}
      </span>
      <span className="text-[15px] font-semibold">{party.name}</span>
      {partyAddressLines(party).map((line) => (
        <span key={line}>{line}</span>
      ))}
      {party.ico ? <span className="mt-1">IČO: {party.ico}</span> : null}
      {party.dic ? <span>DIČ: {party.dic}</span> : null}
      {party.registry ? <span className="text-[11px] text-[#77766f]">{party.registry}</span> : null}
      {party.email ? <span className="mt-1">{party.email}</span> : null}
      {party.phone ? <span>{party.phone}</span> : null}
    </div>
  );
}

/** The invoice as a paper document (A4), always light. Printing saves it as PDF. */
export async function InvoicePaper({ invoice }: { invoice: Invoice }) {
  const { supplier, customer } = invoice;
  const money = (amount: number) => formatMoney(amount, invoice.currency, { exact: true });
  const iban = payableIban(supplier.iban ?? null, supplier.bank_account ?? null);
  const showVat = Boolean(supplier.vat_payer) || invoice.vat !== 0;
  const qr =
    iban && invoice.total > 0 && !invoice.paid_on
      ? await QRCode.toString(
          spaydString({
            iban,
            amount: invoice.total,
            currency: invoice.currency,
            variableSymbol: invoice.variable_symbol,
            message: `Faktura ${invoice.number}`,
            recipient: supplier.name,
          }),
          { type: "svg", margin: 0, errorCorrectionLevel: "M" },
        )
      : null;
  const title =
    invoice.kind === "credit_note"
      ? "Opravný doklad"
      : showVat
        ? "Faktura – daňový doklad"
        : "Faktura";

  return (
    <article className="mx-auto flex w-full max-w-[794px] flex-col gap-10 bg-white p-8 text-[13px] leading-relaxed text-[#0b0b0b] shadow-md sm:p-14 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          <p className="text-[15px] text-[#77766f] tabular">{invoice.number}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 sm:text-right">
          <dt className="text-[#77766f]">Datum vystavení</dt>
          <dd className="tabular">{formatDate(invoice.issued_on)}</dd>
          {showVat && invoice.taxable_on ? (
            <>
              <dt className="text-[#77766f]">Datum zdanitelného plnění</dt>
              <dd className="tabular">{formatDate(invoice.taxable_on)}</dd>
            </>
          ) : null}
          <dt className="text-[#77766f]">Datum splatnosti</dt>
          <dd className="font-semibold tabular">{formatDate(invoice.due_on)}</dd>
          {invoice.variable_symbol ? (
            <>
              <dt className="text-[#77766f]">Variabilní symbol</dt>
              <dd className="tabular">{invoice.variable_symbol}</dd>
            </>
          ) : null}
        </dl>
      </header>

      <section className="grid gap-8 sm:grid-cols-2">
        <PartyBlock title="Dodavatel" party={supplier} />
        <PartyBlock title="Odběratel" party={customer} />
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-[#0b0b0b] text-[11px] tracking-wide text-[#77766f] uppercase">
            <th className="py-2 font-semibold">Položka</th>
            <th className="hidden py-2 text-right font-semibold sm:table-cell print:table-cell">
              Množství
            </th>
            <th className="hidden py-2 text-right font-semibold sm:table-cell print:table-cell">
              Cena/j.
            </th>
            {showVat ? <th className="py-2 text-right font-semibold">DPH</th> : null}
            <th className="py-2 text-right font-semibold">Celkem</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => {
            const totals = lineTotals(item);
            return (
              <tr key={index} className="border-b border-[#e3e2de] align-top">
                <td className="py-2.5 pr-4">
                  {item.description}
                  <span className="block text-[12px] text-[#77766f] tabular sm:hidden print:hidden">
                    {item.quantity.toLocaleString("cs-CZ")} {item.unit ?? ""} ×{" "}
                    {money(item.unit_price)}
                  </span>
                </td>
                <td className="hidden py-2.5 text-right whitespace-nowrap tabular sm:table-cell print:table-cell">
                  {item.quantity.toLocaleString("cs-CZ")} {item.unit ?? ""}
                </td>
                <td className="hidden py-2.5 pl-3 text-right whitespace-nowrap tabular sm:table-cell print:table-cell">
                  {money(item.unit_price)}
                </td>
                {showVat ? (
                  <td className="py-2.5 pl-3 text-right tabular">{item.vat_rate} %</td>
                ) : null}
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular">
                  {money(showVat ? totals.total : totals.base)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="flex flex-col-reverse gap-8">
        <div className="flex flex-col items-start gap-5 border-t border-[#e3e2de] pt-6 sm:flex-row sm:items-end print:flex-row print:items-end">
          {qr ? (
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-28 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <span className="text-[10px] text-[#77766f]">QR Platba</span>
            </div>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 [&>dt]:whitespace-nowrap">
            <dt className="text-[#77766f]">Způsob platby</dt>
            <dd>Převodem</dd>
            {supplier.bank_account ? (
              <>
                <dt className="text-[#77766f]">Číslo účtu</dt>
                <dd className="whitespace-nowrap tabular">{supplier.bank_account}</dd>
              </>
            ) : null}
            {iban ? (
              <>
                <dt className="text-[#77766f]">IBAN</dt>
                <dd className="whitespace-nowrap tabular">{formatIban(iban)}</dd>
              </>
            ) : null}
            {supplier.bic ? (
              <>
                <dt className="text-[#77766f]">BIC</dt>
                <dd className="tabular">{supplier.bic}</dd>
              </>
            ) : null}
          </dl>
        </div>
        <dl className="grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 self-end">
          {showVat ? (
            <>
              <dt className="text-[#77766f]">Základ</dt>
              <dd className="text-right tabular">{money(invoice.subtotal)}</dd>
              <dt className="text-[#77766f]">DPH</dt>
              <dd className="text-right tabular">{money(invoice.vat)}</dd>
            </>
          ) : null}
          <div className="col-span-2 mt-1 flex items-baseline justify-between gap-6 border-t-2 border-[#0b0b0b] pt-2">
            <dt className="text-[15px] font-semibold">
              {invoice.paid_on ? "Uhrazeno" : "K úhradě"}
            </dt>
            <dd className="text-[20px] font-semibold tabular">{money(invoice.total)}</dd>
          </div>
          {invoice.currency !== "CZK" ? (
            <dd className="col-span-2 text-right text-[11px] text-[#77766f]">
              Kurz {invoice.exchange_rate.toLocaleString("cs-CZ")} Kč/{invoice.currency} ·{" "}
              {formatMoney(invoice.total_czk, "CZK", { exact: true })}
            </dd>
          ) : null}
        </dl>
      </section>

      <footer className="flex flex-col gap-1 border-t border-[#e3e2de] pt-4 text-[11px] text-[#77766f]">
        {invoice.note ? (
          <span className="whitespace-pre-line text-[12px] text-[#0b0b0b]">{invoice.note}</span>
        ) : null}
        {!showVat ? <span>Dodavatel není plátcem DPH.</span> : null}
        {supplier.web ? <span>{supplier.web}</span> : null}
      </footer>
    </article>
  );
}
