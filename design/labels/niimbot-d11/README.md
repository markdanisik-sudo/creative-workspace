# Nálepky m.STUDIO – NIIMBOT D11, průhledné štítky 30 × 14 mm

D11 tiskne pás široký 12 mm, štítek má 14 mm → grafika je jen v prostředních ~10 mm (červené čárky v `preview.png` = hranice tisku). Termotisk je jen černý – žádná šedá, proto jsou PNG čistě černobílá (1-bit).

| Soubor | Návrh |
|---|---|
| `01-logo` | logo m.STUDIO přes celou šířku |
| `02-logo-claim` | logo + „We feel your story.“ |
| `03-monogram` | velké „m.“ |
| `04-monogram-claim` | „m.“ │ We feel your story. |
| `05-logo-inverse` | černý pruh s vykrojeným logem (na průhledném štítku vypadá nejlíp) |

- `png/203dpi/` – pro **D11** (240 × 112 px = přesně 30 × 14 mm)
- `png/300dpi/` – pro **D11-H** (354 × 165 px)
- `svg/` – vektor 30 × 14 mm pro další úpravy

## Tisk v aplikaci NIIMBOT
1. Pošlete si PNG do telefonu (AirDrop / Fotky / Soubory).
2. Aplikace NIIMBOT → připojit D11 → **Nový štítek** → rozměr **30 × 14 mm** (nebo vyberte svůj štítek naskenováním / ze seznamu).
3. **Obrázek** → vybrat PNG → roztáhnout přes celý štítek (rohy na rohy).
4. Vypnout ditheringe / „gradace“ pokud je v nastavení obrázku; hustotu tisku (density) dát na 3–4.
5. Vytisknout nejdřív 1 kus a zkontrolovat, že nic není oříznuté.

Úprava všech návrhů: `python3 generate.py ../../instagram/logo-path.txt svg`, pak `node rasterize.js svg png` (Playwright) a převod na 1-bit.
