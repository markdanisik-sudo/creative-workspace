import type { Metadata } from "next";
import { getBusiness } from "@/features/business/queries";
import { Importer } from "@/features/import/Importer";

export const metadata: Metadata = { title: "Import z iDokladu" };

export default async function ImportPage() {
  const business = await getBusiness();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline font-medium">Import z iDokladu</h1>
        <p className="max-w-2xl text-callout text-text-secondary">
          Nahraj své vydané faktury a přehled ti hned ukáže, kolik jsi za který rok vydělal. Import
          můžeš opakovat — co už tu je, se znovu nepřidá.
        </p>
      </div>
      <Importer ownIco={business.ico ?? null} />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-5 shadow-sm">
          <h2 className="text-callout font-semibold">Nejlepší: ISDOC (i s položkami)</h2>
          <ol className="list-decimal space-y-1 pl-5 text-body text-text-secondary">
            <li>
              V iDokladu otevři <b className="text-text">Vydané faktury</b>.
            </li>
            <li>Nastav období (třeba „Vše“) a zaškrtni všechny faktury.</li>
            <li>
              V hromadných akcích zvol <b className="text-text">Export → ISDOC</b>.
            </li>
            <li>Stažený ZIP přetáhni sem — rozbalovat ho nemusíš.</li>
          </ol>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-5 shadow-sm">
          <h2 className="text-callout font-semibold">Rychlé: seznam v CSV</h2>
          <p className="text-body text-text-secondary">
            V seznamu vydaných faktur zvol export do <b className="text-text">CSV</b> (ne Excel).
            Každý řádek bude jedna faktura s celkovou částkou — na přehled příjmů to stačí, jen bez
            jednotlivých položek. Načtu sloupce jako Číslo dokladu, Datum vystavení, Splatnost,
            Odběratel, IČ, Celkem, Měna a Datum úhrady.
          </p>
        </div>
      </section>
    </div>
  );
}
