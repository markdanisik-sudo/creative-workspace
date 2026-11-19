# Instagram šablony – m.STUDIO

15 šablon: 3 rozvržení × 5 formátů. Text je živý (Inter), vrstvy jsou pojmenované.

| Formát | Rozměr | Kde |
|---|---|---|
| Feed 1:1 | 1080 × 1080 | čtvercový post, karusel |
| Feed 4:5 | 1080 × 1350 | na výšku – nejvíc místa ve feedu |
| Feed 3:4 | 1080 × 1440 | nová mřížka profilu |
| Feed 1.91:1 | 1080 × 566 | na šířku |
| Story & Reels 9:16 | 1080 × 1920 | story, reels, cover reelsu |

Rozvržení: **Work** (projekt jako karta z webu), **Statement** (tmavý box s větou), **Photo** (fotka přes celou plochu).

## Do Figmy
1. Přetáhněte všechny `.svg` soubory najednou na plátno Figmy – každý se vloží jako samostatný frame.
2. Fotka: vyberte vrstvu „Photo – vložte obrázek“ → Fill → Image. Vrstvu „Hint – smazat“ smažte.
3. Text přepíšete dvojklikem. Písmo je Inter (ve Figmě je k dispozici).
4. Story/Reels mají nahoře 250 px a dole 340 px volno pro ovládací prvky Instagramu – text tam nedávejte.

Úprava všech šablon najednou: `python3 design/instagram/generate.py design/instagram/logo-path.txt design/instagram`.

# Karusel „Night Drive“ – 10 snímků

Složka `carousel/` – jeden celý karusel v každém formátu (`feed-1x1`, `feed-4x5`, `feed-3x4`, `feed-1.91x1`, `story-reel-9x16`). Snímky na sebe navazují, počítadlo jde 01/10 → 10/10 a čísla kapitol odpovídají obsahu.

| # | Soubor | Snímek |
|---|---|---|
| 01 | `01-cover` | Úvod – fotka přes celou plochu, velký název |
| 02 | `02-index` / `02b-index-card` | Obsah: 01 The idea · 02 On set · 03 Behind the lens · 04 The city · 05 Final cut (světlý / karta přes fotku) |
| 03 | `03-chapter` | Kapitola 01 – rozmazaná fotka, velké číslo |
| 04 | `04-photo-card` | Kapitola 02 – zaoblená fotka na papíře + popisek |
| 05 | `05-duo` | Kapitola 02 – dvě fotky s popisky |
| 06 | `06-split` | Kapitola 03 – nadpis nahoře, fotka dole |
| 07 | `07-band` | Kapitola 04 – pás přes fotku |
| 08 | `08-grid` | Kapitola 04 – mřížka 4 fotek |
| 09 | `09-text` | Kapitola 05 – krátký příběh |
| 10 | `10-end` | Závěr – logo, „See the full film“, odkaz |

Snímky jdou libovolně vynechat nebo opakovat (např. víc `05-duo`) – jen přepište počítadlo „NN/10“ a čísla kapitol.
Rozmazané pozadí: u vrstev „(Layer blur 60)“ přidejte ve Figmě Effects → Layer blur.
Karusel na Instagramu musí mít všechny snímky ve stejném formátu.
