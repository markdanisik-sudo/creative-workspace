# Film Lab: Kodak Vision3 + 2383 film emulace pro DaVinci Resolve

Emulace negativů Kodak Vision3 (50D, 200T, 250D, 500T) a kopírovacího materiálu Kodak 2383. Model stojí na datech z technických listů Kodaku, u všech pěti materiálů: charakteristické křivky, spektrální citlivost a spektrální hustota barviv. Podrobný audit, zdroj každého parametru, předpoklady a validace jsou v [`FILMLAB_V4.md`](FILMLAB_V4.md).

| Soubor | Co dělá |
|---|---|
| `FilmLab_Color.dctl` (v4) | Vstup z kamery → negativ (včetně halace a zrna) → print 2383 → výstup |
| `FilmLab_Texture.dctl` (v3) | Optika a pohyb na hotovém obraze: MTF, bloom, breath, gate weave, vinětace |
| `FilmLab_LUT_Library.dctl` + složka `FilmLab_LUTs` | Knihovna 10 vlastních LUTů s posuvníkem intenzity |
| `backup/FilmLab_Color_v3.dctl`, `backup/FilmLab_Texture_v2.dctl` | Předchozí verze beze změny, včetně starých stocků (Vision2, Vision, EXR, ECN II) |

**Doporučený node tree:** viz [`NODE_TREE.md`](NODE_TREE.md).

> Vyžaduje **DaVinci Resolve Studio**.

## Instalace

1. Zkopíruj `FilmLab_Color.dctl` a `FilmLab_Texture.dctl` do složky LUT:
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/`
   - **Linux:** `/opt/resolve/LUT/`
2. *Project Settings → Color Management → Lookup Tables → Update Lists* (nebo restart Resolve).
3. Na Color page přidej **ResolveFX → DCTL** a v *DCTL List* vyber plugin.

## Pořadí nodů

```
[korekce v logu] → [FilmLab Color] → [FilmLab Texture] → výstup
```

- **FilmLab Color** dostává log z kamery. Výchozí vstup je **Canon Cinema Gamut / Canon Log 2** (Canon C50). Výstupem je hotový obraz pro displej, takže nahrazuje výstupní LUT nebo CST.
- **FilmLab Texture** jde za něj a počítá se **SDR výstupem**.
- U color-managed timeline nastav výstupní transformaci tak, aby nic netonemapovala.

### Canon C50: kontrola Input Data Levels (1 minuta)

1. Na Canon Log 2 klip dej na jeden node *Color Space Transform* Canon Cinema Gamut / Canon Log 2 → DaVinci WG / DaVinci Intermediate.
2. Na paralelní node dej Film Lab s **DRT = Off – negative scan**, **Negative Stock = None**.
3. Na šedé kartě se s CST shodne jedna z voleb **Input Data Levels** (*Full* nebo *Video*). Tu používej.

Verze v3 dekódovala Canon Log 2 / 3 chybně: šeď o 0,1–0,2 stopy, světla až o 2 stopy.

## FilmLab Color: ovládání

> Resolve řadí ovládání podle typu: nahoře posuvníky, pod nimi zaškrtávátka, dole menu. Značky říkají, odkud hodnota pochází:
> - **[M]** digitalizováno z dat Kodaku
> - **[F]** nafitováno
> - **[E]** odhad bez dat

### Vstup a scéna (před filmem)
| Parametr | Co dělá |
|---|---|
| **Input Color Space / Input Gamma / Input Data Levels** | Kamera (Canon Cinema Gamut / Canon Log 2 a 3, ARRI, Sony, Panasonic, RED, DWG, Rec.709 / 2020, Cineon) a interpretace úrovní, viz výše. |
| **Exposure** | Expozice ve stopách, jako clona na place. Podexpozice posouvá obraz do toe negativu, přeexpozice do ramene, u všech stocků stejně. |
| **Temperature K / Tint** | Vyvážení bílé (CAT02), jako filtr nebo vyvážení kamery: 6500 K = beze změny. |

### Negativ
| Parametr | Co dělá |
|---|---|
| **Negative Stock** | **Vision3 50D, 200T, 250D, 500T** [M]: vlastní křivky každé vrstvy, spektrální citlivost a barviva z technických listů Kodaku (50D používá barviva 250D). **500T no rem-jet**: bez antihalační vrstvy, výrazná halace [E]. **None**: ideální negativ. |
| **Push Pull** | Delší nebo kratší vyvolání (−1 až +2) [E]: vyšší gamma vrstev, rychlost v toe, závoj, víc zrna. Kopírka je nastavená na normálně vyvolaný negativ, takže push zjasní obraz. 1 stopa podexpozice + Push 1 dá zhruba normální šeď. Není to expozice ani kontrast. |
| **Interimage** | Vzájemné tlumení vrstev při vyvolání [F na skenu 250D]. 1 = kalibrace, 0 = jen data Kodaku. |
| **Film Saturation** | Odchylka každé vrstvy od neutrálu o stejné expozici, po vyvolání. Šedé nemění, v toe a rameni působí méně, jako u skutečného filmu. |
| **Layer Density Cyan / Magenta / Yellow** | Množství barviva v jednotlivých vrstvách. Laboratoř přečasuje šeď, takže se mění crossover (barvy stínů a světel), ne vyvážení šedé. |
| **Negative Bleach Bypass** | Stříbro zůstane v negativu [E]. |
| **Halation** | Světlo odražené od podložky znovu exponuje červenou (a trochu zelenou) vrstvu, ještě před vyvoláním [E]. Plochy beze světel nemění. |
| **Grain / Film Format / Animate Grain** | Zrno v hustotě negativu, nezávislé v každé vrstvě [E]. Přes křivku printu je nejvíc vidět ve středních tónech. Formát určuje velikost zrna a halace vůči obrazu. |

### Print 2383 a výstup
| Parametr | Co dělá |
|---|---|
| **Print Stock** | **Kodak 2383** [M], projekce D65. D60 / D55 jsou teplejší projekce [E]. 2393 je odhad z 2383 [E]. |
| **Print Exposure / Printer Light R G B** | Časování kopie v printer points (12 = 1 stopa). |
| **Print Contrast** | Vyvolání printu [E]. |
| **Print Dye Saturation** | Odchylka barviv printu od neutrálu. |
| **Print Crosstalk** | Vazba vrstev 2383 nafitovaná na skutečném printu [F]. 1 = kalibrace, 0 = jen data Kodaku. |
| **Print Bleach Bypass / Projection Flare** | Stříbro v printu, rozptyl světla v kině [E]. |
| **DRT** | Film Print · Neutral (bez printu) · Off – sken negativu do DWG / DI · Off – Cineon (pro 2383 LUT z Resolve). |
| **Output, HDR Peak / Grey** | Rec.709, sRGB, P3, PQ, HLG. |
| **Strength** | Prolnutí s neutrálním obrazem bez filmu. |
| **Show Curve** | Tónová křivka nodu vlevo dole (−8 až +8 stop). |

**Odstraněno proti v3:**
- Kontrast, Highlights, Shadows, Saturation a Skin na scéně: patří do korekce před nodem.
- Color Density: nahrazuje ji Film Saturation.
- Negative / Print Version: nahrazují je posuvníky Interimage a Print Crosstalk na 0 / 1.
- Negative / Print Strength.
- Neutral curves, Black Toe a roll-offy.
- Staré stocky: najdeš je v `backup/FilmLab_Color_v3.dctl`.

## FilmLab Texture: ovládání

| Parametr | Co dělá |
|---|---|
| **Strength** | Celková síla. |
| **MTF Softness, Acutance, Red Layer Softness** | Kresba filmu, zvýraznění hran z vyvolávání, měkčí červená vrstva. |
| **Bloom Amount / Radius / Threshold** | Difuze (Pro-Mist). |
| **Film Format** | Velikost efektů vůči obrazu. |
| **Film Breath / Gate Weave / Vignette** | Kolísání expozice, pohyb v okénku, vinětace. |
| **Halation / Grain (v3 display)** | Starší verze halace a zrna na hotovém obraze. Ve výchozím stavu jsou vypnuté, protože ve v4 jsou v negativu ve FilmLab Color. |
| **Quality** | Vzorky pro bloom (Low při gradingu, High pro render). |

## Recepty (výchozí body)

- **Teplé, zlaté exteriéry:** 250D · 2383 · Print Exposure −1, Printer Light R +2, G +1, B −2 · Film Saturation 1.1 · Grain 0.8 · Halation 1.
- **Čisté, syté:** 50D · 2383 · Film Saturation 1.2 · Printer Light R +1, B −1 · Grain 0.5.
- **Noc, interiéry pod žárovkou:** 500T · Temperature 3200 · Grain 1.2 · Printer Light B +2, G +1 pro chladnější noc.
- **Noční město / CineStill:** 500T no rem-jet · Halation 1–2 · Grain 1.2.
- **Podexponováno a pushnuto:** Exposure −1 · Push Pull +1: vyšší kontrast, víc zrna, normální šeď.
- **Bleach bypass:** 500T · Print Bleach Bypass 0.6–1.0 · Print Exposure +3 až +5 · Print Dye Saturation 0.8.

## Vývoj a ověření

- `tools/filmlab_model.py`: referenční model celého řetězce v Pythonu.
- `tools/export.py`: vygeneruje datový blok v `FilmLab_Color.dctl` (`--check` ověří, že je aktuální).
- `tools/fit_calibration.py`: nafituje interimage a cross-talk na ColorCheckerech, s validací leave-one-out.
- `tools/validate_colorchecker.py`: srovná v3 a v4 s printem 2383.
- `tests/test_filmlab.py`: 19 testů proti datům Kodaku, colour-science a referenčnímu modelu. Spuštění: `python3 dctl/tests/test_filmlab.py`, potřebuje g++, numpy, scipy a colour-science.

Na 18% šedou kartu vychází ~0,41 (Rec.709): Kodak LAD, vizuální hustota 1,0 v kině. Zrno posuzuj při 100% zoomu.
