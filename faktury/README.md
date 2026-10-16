# Faktury

Samostatná aplikace na fakturaci pro jednu firmu (OSVČ, neplátce i plátce DPH):

- **Přehled** — kolik je vyfakturováno a zaplaceno za rok, po měsících, po letech,
  nejlepší klienti, faktury po splatnosti a hlídání limitu pro registraci k DPH.
- **Import z iDokladu** — ISDOC (`.isdoc`, `.isdocx`, ZIP) i seznam v CSV. Opakovaný import
  nic nezdvojí.
- **Faktury** — vystavení, QR platba, PDF (tisk), **ISDOC 6.0.2** ke každé faktuře a ZIP
  všech faktur za rok pro účetní; kontakty s doplněním z ARES.
- **Zabezpečení** — jediný účet (po jeho založení databáze další registrace odmítá),
  dvoufázové ověření, každá tabulka chráněná row-level security.

Je úplně oddělená od m.studio.lab: vlastní složka, vlastní databáze, vlastní adresa.

## Aplikace pro Mac (offline)

**Stažení:** GitHub → Releases → **Faktury pro Mac** → `Faktury.dmg`. Otevři ho a přetáhni
Faktury do Aplikací. Při prvním spuštění: Nastavení systému → Soukromí a zabezpečení →
**Přesto otevřít** (aplikace není podepsaná placeným certifikátem Apple).

- Žádný účet ani internet: data jsou v souboru
  `~/Library/Application Support/Faktury/faktury.sqlite` (zálohuje ho i Time Machine).
- Nastavení → **Zálohovat** stáhne jeden soubor se vším; **Obnovit ze zálohy** ho vrátí
  (třeba na novém Macu).
- Jak to funguje: Electron (`desktop/`) spustí na pozadí stejný server jako webová verze
  (`FAKTURY_STORE=local`, data přes vestavěné SQLite v Node). Okno se k němu připojuje
  s tajným klíčem, takže jiné programy v počítači k datům nesmí.
- `.dmg` sestavuje GitHub Actions na Macu (`.github/workflows/faktury-mac.yml`) po každé
  změně ve složce `faktury/`.

## Nasazení (Vercel + Supabase)

1. **Vercel → Add New… → Project** → vyber repozitář `creative-workspace`.
   V **Root Directory** zvol `faktury` → **Deploy**. (První nasazení skončí chybou —
   ještě nemá databázi. To je v pořádku.)
2. V novém projektu **Storage → Create Database → Supabase** → region **Frankfurt** →
   připojit k tomuto projektu. Vercel sám doplní proměnné prostředí.
3. **Deployments → … → Redeploy.** Build sám založí tabulky v databázi.
4. V **Supabase → Authentication → Sign In / Providers → Email** vypni **Confirm email**
   a nastav minimální délku hesla 10.
5. Otevři adresu aplikace a založ si účet. Pak už se nikdo další zaregistrovat nemůže.
6. **Nastavení** → IČO → „Načíst z ARES“, číslo účtu, a zapni dvoufázové ověření.

**Instalace:** Mac (Safari) → Soubor → Přidat do Docku · Chrome → ikona instalace v adresním
řádku · iPhone → Sdílet → Přidat na plochu.

## Lokálně

```bash
cd faktury
npm install
npx supabase start          # databáze na portech 544xx (vedle m.studio.lab)
# .env.local: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ze `supabase status`
npm run dev                 # http://localhost:3001
```

Desktopový režim bez Supabase: `FAKTURY_STORE=local npm run dev` (data v `.data/`).

Kontroly: `npm run typecheck`, `npm run lint`, `npm test`.
