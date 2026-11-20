# Instagram šablony – m.STUDIO

9 šablon: 3 rozvržení × 3 formáty. Text je živý (Inter), vrstvy jsou pojmenované.

| Formát | Rozměr | Kde |
|---|---|---|
| Feed 4:5 | 1080 × 1350 | příspěvek / karusel na výšku |
| Story & Reels 9:16 | 1080 × 1920 | story, reels, cover reelsu |
| Landscape 16:9 | 1920 × 1080 | na šířku |

Rozvržení: **Work** (projekt jako karta z webu), **Statement** (tmavý box s větou), **Photo** (fotka přes celou plochu).

## Do Figmy
1. Přetáhněte všechny `.svg` soubory najednou na plátno Figmy – každý se vloží jako samostatný frame.
2. Fotka: vyberte vrstvu „Photo – vložte obrázek“ → Fill → Image. Vrstvu „Hint – smazat“ smažte.
3. Text přepíšete dvojklikem. Písmo je Inter (ve Figmě je k dispozici).
4. Story/Reels mají nahoře 250 px a dole 340 px volno pro ovládací prvky Instagramu – text tam nedávejte.

Úprava všech šablon najednou: `python3 design/instagram/generate.py design/instagram/logo-path.txt design/instagram`.

# Karusel „Night Drive“ – 10 snímků

Složka `carousel/` – jeden celý karusel v každém formátu (`feed-4x5`, `story-reel-9x16`, `landscape-16x9`). Vše ve stylu webu: Inter, popisky „/Label …… (01)“, zaoblené boxy, dvoubarevný text, pilulky, patička s logem.

| # | Soubor | Snímek |
|---|---|---|
| 01 | `01-cover` | Velký název, tagline vpravo, zaoblená fotka |
| 02 | `02-contents` | Obsah jako bento z m.studio.lab – velká tmavá dlaždice + menší šedé |
| 03 | `03-chapter` | Tmavý snímek kapitoly – velký nadpis + dvoubarevný text |
| 04 | `04-project` | Karta projektu jako na webu – fotka, název, rok, typ |
| 05 | `05-duo` | Dvě karty (v Story pod sebou) |
| 06 | `06-monitor` | Záběr jako na monitoru kamery – REC, timecode, ISO, rohové značky |
| 07 | `07-statement` | Dvoubarevné prohlášení + pilulka |
| 08 | `08-services` | Tmavý box „What we did“ s položkami a + (jako služby na webu) |
| 09 | `09-bento` | Velká fotka + dvě menší, popisky v pilulkách |
| 10 | `10-end` | Patička webu – výzva, pilulka, velké logo |

Číslo v pravém horním rohu (01)–(10) je pořadí snímku. Snímky jde vynechat nebo opakovat – jen přepište číslo.
Karusel na Instagramu musí mít všechny snímky ve stejném formátu.
