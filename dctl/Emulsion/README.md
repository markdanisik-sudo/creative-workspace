# Emulsion: jednoduchý filmový look pro DaVinci Resolve

Jeden node rovnou z logu kamery na obrazovku, s 8 posuvníky a 4 menu. Nemá nic společného s pipeline Film Labu (spektrální negativ a print). Staví na dvou věcech:

- **Tónová křivka podle Cinesumer.** Křivka je digitalizovaná z jejich příspěvku (screenshot z Instagramu) a nafitovaná na hladkou S-křivku. 18% šeď padá na 0,28, takže obraz je hutnější a tmavší než u Film Labu (0,41).
- **Barevný crossover printu Kodak 2383** z naší kalibrace. Poměr kontrastu vrstev 2383 (Status A gamma R 4,74, G 4,08, B 3,54) dává azurové stíny, teplá světla a neutrální šeď. Stejný charakter jsme naměřili i v záběrech Cinesumer.

> Vyžaduje **DaVinci Resolve Studio**.

## Instalace

1. Ve složce LUT v Resolve vytvoř složku `Emulsion` a zkopíruj do ní **obsah složky `plugin/`** (`Emulsion.dctl` a složku `Emulsion_lib/`):
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\Emulsion\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/Emulsion/`
   - **Linux:** `/opt/resolve/LUT/Emulsion/`
2. *Project Settings → Color Management → Lookup Tables → Update Lists* (nebo restart Resolve).
3. Na Color page: **ResolveFX → DCTL**, v *DCTL List* vyber `Emulsion/Emulsion`.

## Použití

```
[korekce v logu] → [Emulsion] → výstup
```

Nastav **Input Color Space** a **Input Gamma** podle kamery (nebo nech DaVinci WG / Intermediate, když před ním máš CST). Emulsion dělá i převod na displej, takže za ním už nedávej výstupní LUT ani CST. U color-managed timeline nastav výstup na DWG/Intermediate bez tone mappingu.

## Ovládání

| Parametr | Co dělá |
|---|---|
| **Look** | **Kodak 2383 Print** (výchozí) · **Day – 250D warm** (teplejší, měkčí) · **Night – 500T cool** (chladnější, silnější crossover) · **Bleach Bypass** (málo barev, tvrdý kontrast) · **Neutral** (jen křivka, bez barevného charakteru) |
| **Exposure** | Expozice ve stopách. Look je záměrně tmavší; **+0,7** dá šeď na obvyklých 0,41. |
| **Temperature** | − chladnější, + teplejší (chromatická adaptace, ±60 miredů). |
| **Contrast** | Kontrast křivky kolem 18% šedé (šeď zůstává na místě). |
| **Saturation** | Sytost (násobí sytost zvoleného looku). |
| **Fade** | Zvednuté studené černé: 1 = jako v záběrech Cinesumer (černá ≈ 0,024 / 0,035 / 0,043), 0 = čistá černá. |
| **Halation** | Červenooranžová záře kolem světel nad zhruba +3 stopy. Počítá se na světle scény, před křivkou, jako ve filmu. |
| **Grain** | Zrno 35 mm (nejvíc vidět ve středních tónech, mění se s obrazem). |
| **Strength** | Síla barevného charakteru looku (crossover, sytost, teplota, fade). 0 = jen neutrální křivka. |
| **Input Color Space / Input Gamma** | Kamera: DaVinci WG, ARRI WG3/WG4, S-Gamut3.Cine, V-Gamut, RED WG, Canon Cinema Gamut, Rec.709, Rec.2020 · DI, LogC3, LogC4, S-Log3, V-Log, Log3G10, Canon Log 2/3, Gamma 2.4, Linear, Cineon. |
| **Output** | Rec.709 Gamma 2.4 · sRGB 2.2 · P3-D65 2.6 (stejné světlo na displeji, jen jiné kódování). |

## Jak to funguje

1. Log kamery → lineární světlo scény (Rec.2020), expozice a halace.
2. Teplota (CAT02) a sytost na světle scény.
3. Převod do DaVinci Wide Gamut. Každý kanál zvlášť v kódu DaVinci Intermediate: kontrast kolem šedé s crossoverem 2383 (červená strmější, modrá plošší), pak S-křivka Cinesumer.
4. Převod do výstupního gamutu s kompresí přesycených barev, fade a zrno.

Protože křivka běží po kanálech v širokém gamutu, sytost přirozeně klesá ve světlech a světla se stáčejí do teplé krémové, jako u printu.

**Pozor na křivku:** osy v jejich grafu nejsou popsané. Počítám s tím, že vodorovná osa je kód DaVinci Intermediate. Kdyby to byl LogC3, šeď by u nich vycházela kolem 0,42 a stačí dát Exposure +0,7. Přesné naladění na jejich DCTL by šlo jen z dvojice stejných snímků s pluginem a bez něj.

## Vývoj

```
plugin/Emulsion.dctl         ovládání a pořadí kroků
plugin/Emulsion_lib/         core.h, input.h (kamery), grade.h (teplota, sytost),
                             look.h (křivka, crossover, výstup, fade), texture.h (halace, zrno)
test/                        testy bez Resolve: DCTL se přeloží jako C++ a spustí na CPU
test/cinesumer_curve.json    digitalizovaná křivka (reference pro test)
```

Testy: `python3 test/test_emulsion.py` (potřebuje `g++` a `numpy`). Kontrolují zdrojáky (literály s `f`, nic, co GPU nepřeloží), shodu s křivkou Cinesumer, šeď, monotónní křivky, crossover, fade, teplotu, výstupy, vstupy z kamer, halaci, zrno a krajní hodnoty. `test/shim.h` napodobuje runtime DCTL jen pro CPU, takže je plugin potřeba vyzkoušet i v Resolve.
