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

Složka `carousel/` – jeden celý karusel v každém formátu (`feed-1x1`, `feed-4x5`, `feed-3x4`, `feed-1.91x1`, `story-reel-9x16`). Vše ve stylu webu: Inter, popisky „/Label …… (01)“, zaoblené boxy, dvoubarevný text, pilulky, patička s logem.

| # | Soubor | Snímek |
|---|---|---|
| 01 | `01-cover` | Velký název, tagline vpravo, zaoblená fotka |
| 02 | `02-contents` | Obsah jako menu webu – řádky s linkou a (01)–(05) |
| 03 | `03-chapter` | Tmavý snímek kapitoly – velký nadpis + dvoubarevný text |
| 04 | `04-project` | Karta projektu jako na webu – fotka, název, rok, typ |
| 05 | `05-duo` | Dvě karty (v Story pod sebou) |
| 06 | `06-photo` | Fotka s větou uprostřed (jako obrázek v menu webu) |
| 07 | `07-statement` | Dvoubarevné prohlášení + pilulka |
| 08 | `08-services` | Tmavý box „What we did“ s položkami a + (jako služby na webu) |
| 09 | `09-grid` | Mřížka 4 zaoblených fotek |
| 10 | `10-end` | Patička webu – výzva, pilulka, velké logo |

Číslo v pravém horním rohu (01)–(10) je pořadí snímku. Snímky jde vynechat nebo opakovat – jen přepište číslo.
Karusel na Instagramu musí mít všechny snímky ve stejném formátu.
