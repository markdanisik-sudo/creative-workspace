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
