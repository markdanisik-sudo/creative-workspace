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

Kontroly: `npm run typecheck`, `npm run lint`, `npm test`.
