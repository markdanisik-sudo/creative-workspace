# Emulsion: digital to film pro DaVinci Resolve

Jeden node rovnou z logu kamery na obrazovku. Rozložení ovladačů vychází ze SumerFade Lite (Cinesumer): neutrální výchozí hodnoty a charakter filmu volíš v menu **Negative Stock** a **Print Stock**. Kód je vlastní a stojí na třech věcech:

- **Tónová křivka podle Cinesumer**, digitalizovaná z jejich příspěvku. SumerFade má výchozí *Contrast Pivot* 0,336, což je 18% šeď v DaVinci Intermediate. Potvrzuje to, že křivka pracuje v DI a šeď padá na 0,28.
- **Negativy z dat Kodaku:** citlivost vrstev Vision3 50D / 250D / 500T (barevná matice), interimage nafitovaný na skutečný sken 250D a gamma vrstev.
- **Crossover celého systému negativ × print:** gamma vrstev negativu krát gamma 2383 (R 4,74, G 4,08, B 3,54). Pro 250D na 2383 vychází poměr R 1,00 a B 0,84, takže crossover dělá hlavně modrá vrstva: modré stíny a žlutooranžová, krémová světla.

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

> Resolve řadí ovládání DCTL podle typu: nahoře posuvníky, pod nimi zaškrtávátka a dole menu.

### Film
| Parametr | Co dělá |
|---|---|
| **Negative Stock** | **Kodak Vision3 50D 5203** (nejčistší, tvrdší toe) · **250D 5207** (výchozí) · **500T 5219** (měkčí toe) · **CineStill 50D / 800T** (stejné emulze bez anti-halační vrstvy rem-jet: 3× silnější, širší a červenější halace) · **None** (bez negativu). |
| **Print Stock** | **Kodak Vision Color 2383** · **Kodak Vision Premier 2393** (víc kontrastu, hlubší černé) · **None** (bez crossoveru printu). Negative None + Print None = jen neutrální křivka. |

### Tón a barva
| Parametr | Co dělá |
|---|---|
| **Exposure** | Expozice ve stopách. Look je záměrně tmavší (šeď 0,28); **+0,7** dá šeď na obvyklých 0,41. |
| **Temperature** | − chladnější, + teplejší (CAT02, ±60 miredů). |
| **Contrast / Contrast Pivot** | Kontrast každé vrstvy kolem pivotu v kódu DI. Výchozí pivot **0,336** = 18% šeď, šeď zůstává na místě. |
| **Split Mix** | Navíc ke crossoveru printu: + = chladnější stíny a teplejší světla, − = opačně. Šeď se nemění. |
| **Shadow Roll-off / Highlight Roll-off** | + = měkčí, delší přechod (zvednuté stíny, nižší světla), − = tvrdší. Šeď, černá i bílá zůstávají. |
| **Red / Green / Blue Density** | Strmost (hustota) každé vrstvy kolem šedé. Víc červené density = méně červené ve stínech a víc ve světlech. |
| **Film Saturation** | Sytost světla scény před filmem. |
| **Fade** | Zvednuté studené černé: 1 = jako v záběrech Cinesumer (≈ 0,024 / 0,035 / 0,043), 0 = čistá černá. U 2393 jsou černé hlubší. |

### Textura
| Parametr | Co dělá |
|---|---|
| **Enable Grain**, **Grain Strength / Color / Size** | Zrno (ve výchozím stavu vypnuté). Color 0 = monochromatické, 1 = každá vrstva zvlášť. Size: 65mm / 35mm / Super 16 / Super 8; menší formát = větší a výraznější zrno. Mění se s každým snímkem. |
| **Enable Halation**, **Halation Strength / Preset** | Červenooranžová záře kolem světel nad zhruba +3 stopy, počítaná na světle scény před negativem. Preset = formát filmu (velikost záře vůči obrazu). |
| **Gate Weave Preset** | OFF / Subtle / Strong: jemný pohyb obrazu v okénku, každý snímek jinak. |

### Vstup a výstup
| Parametr | Co dělá |
|---|---|
| **Input Colorspace / Input Gamma** | Kamera: DaVinci WG, ARRI WG3 / WG4, S-Gamut3.Cine, V-Gamut, RED WG, Canon Cinema Gamut, Rec.709, Rec.2020 · DI, LogC3, LogC4, S-Log3, V-Log, Log3G10, Canon Log 2 / 3, Gamma 2.4, Linear, Cineon. |
| **Output** | Rec709 Gamma 2.4 · sRGB 2.2 · P3-D65 2.6. |

Oproti SumerFade zatím chybí HDR výstup, Processing Mode, Vintage Border a Damage.

## Jak to funguje

1. Log kamery → lineární světlo scény (Rec.2020), gate weave, expozice a halace.
2. Teplota (CAT02) a sytost.
3. **Negativ:** expozice tří vrstev podle spektrální citlivosti stocku, interimage v logaritmu expozice.
4. **Print:** každá vrstva zvlášť v kódu DaVinci Intermediate: kontrast kolem pivotu, density a crossover negativ × print, pak S-křivka Cinesumer a roll-offy.
5. Vrstvy → Rec.2020 přes referenční 250D (každý stock si tak drží svou barvu) → výstupní gamut s kompresí přesycených barev, fade, zrno.

**Pozor na křivku:** je digitalizovaná ze screenshotu, ne změřená na jejich DCTL. Přesně naladit look by šlo jen z dvojice stejných snímků s pluginem a bez něj.

## Vývoj

```
plugin/Emulsion.dctl         ovládání a pořadí kroků
plugin/Emulsion_lib/         core.h, input.h (kamery), grade.h (teplota, sytost),
                             look.h (negativ, print, křivka, výstup, fade),
                             texture.h (halace, zrno, gate weave)
test/                        testy bez Resolve: DCTL se přeloží jako C++ a spustí na CPU
test/cinesumer_curve.json    digitalizovaná křivka (reference pro test)
```

Testy: `python3 test/test_emulsion.py` (potřebuje `g++` a `numpy`). Kontrolují zdrojáky (literály s `f`, nic, co GPU nepřeloží), rozložení ovladačů, shodu s křivkou Cinesumer, šeď u všech stocků, monotónní křivky, crossover, Split Mix, density, roll-offy, fade, rozdíly mezi stocky, teplotu, výstupy, vstupy z kamer, halaci (i CineStill), zrno, gate weave a krajní hodnoty. `test/shim.h` napodobuje runtime DCTL jen pro CPU, takže je plugin potřeba vyzkoušet i v Resolve.
