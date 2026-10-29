# Emulsion: Kodak / Eastman film emulace pro DaVinci Resolve

Nový plugin postavený od nuly. Umí totéž co Film Lab (negativ Vision3 / Vision2 / Vision / EXR / ECN II, print Kodak 2383 / 2393, textura filmu a knihovna LUTů), ale má novou strukturu kódu, vygenerovaná data a testy, které běží bez Resolve.

| Soubor | Co dělá |
|---|---|
| `Emulsion_Film.dctl` | Barva a tonalita: vstup z kamery, primaries, negativ, print / DRT a výstup (SDR i HDR) |
| `Emulsion_Texture.dctl` | Textura filmu: MTF, halace, bloom, zrno, breath, gate weave a vinětace |
| `Emulsion_LUT.dctl` + `Emulsion_LUTs/` | Knihovna 10 vlastních LUTů s posuvníkem intenzity |
| `Emulsion_lib/` | Sdílený kód obou nodů a spektrální data Kodaku. Musí ležet vedle `.dctl` souborů. |

> Vyžaduje **DaVinci Resolve Studio**.

## Instalace

1. Ve složce LUT v Resolve vytvoř složku `Emulsion` a zkopíruj do ní **celý obsah složky `plugin/`** (tři `.dctl` soubory, `Emulsion_lib/` a `Emulsion_LUTs/`):
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\Emulsion\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/Emulsion/`
   - **Linux:** `/opt/resolve/LUT/Emulsion/`
2. V Resolve: *Project Settings → Color Management → Lookup Tables → Update Lists* (nebo Resolve restartuj).
3. Na Color page přidej na node **ResolveFX → DCTL** a v *DCTL List* vyber `Emulsion/Emulsion_Film` (případně Texture / LUT).

Film Lab a Emulsion můžou být nainstalované vedle sebe a nijak se neovlivňují.

## Pořadí nodů

```
[CST do DWG/DI] → [korekce v logu] → [Emulsion Film] → [Emulsion Texture] → výstup
```

- **Emulsion Film** dostává log z kamery (nastav *Input Color Space* a *Input Gamma*) nebo DaVinci WG / Intermediate. Výstupem je hotový obraz pro displej, takže nahrazuje výstupní LUT nebo CST.
- **Emulsion Texture** jde hned za něj. Pracuje se SDR výstupem: nastav *Display Gamma* podle výstupu Emulsion Film (Rec.709 2.4 / sRGB 2.2 / P3 2.6). Na HDR výstup (PQ / HLG) se nehodí.
- Projekt: *Color Science = DaVinci YRGB*, *Timeline / Output = Rec.709 Gamma 2.4*. U color-managed timeline (DWG, ACES) nastav výstupní transformaci tak, aby nic netonemapovala, jinak se křivka použije dvakrát.
- Celý doporučený node tree (CST, korekce, halace a zrno z ResolveFX, LUTy) je v [`../NODE_TREE.md`](../NODE_TREE.md). Platí stejně, jen místo FilmLab_* použij Emulsion_*.

## Emulsion Film: ovládání

> Resolve řadí ovládání DCTL podle typu: nahoře **posuvníky**, pod nimi **zaškrtávátka**, dole **rozbalovací menu**. Tabulky jsou seřazené podle významu.

### Hlavička
| Parametr | Co dělá |
|---|---|
| **Input Color Space / Input Gamma** | Gamut a gamma kamery: DaVinci WG, ARRI WG3 / WG4, S-Gamut3.Cine, V-Gamut, RED WG, Canon Cinema Gamut, Rec.709, Rec.2020 · DaVinci Intermediate, LogC3, LogC4, S-Log3, V-Log, Log3G10, Canon Log 2 / 3, Gamma 2.4, Linear, Cineon Log (scan filmu). |
| **Negative Stock** | 23 negativů nebo **None – print only** (samotný print bez negativu). Vision3 50D, 250D a 500T jsou spektrální modely z technických listů Kodaku. Ostatní používají spektrální data Vision3 se svou vlastní tonalitou. |
| **DRT** | **Film Print** · **Neutral** (neutrální DRT bez printu) · **Off – DWG / Intermediate** (scénický výstup pro vlastní transformaci) · **Off – Cineon Log** (pro originální 2383 LUT z Resolve). |
| **Print Stock** | Kodak 2383 D65 / D60 / D55 (liší se bílou projekce) · Kodak 2393 (víc kontrastu, hlubší černé). |
| **Output** | Rec.709 Gamma 2.4 · sRGB 2.2 · P3-D65 2.6 · Rec.2100 PQ · Rec.2100 HLG. |
| **Strength** | Síla filmu: 1 = plný film, 0 = stejný obraz přes neutrální DRT bez filmu. |
| **Negative Strength** | 1 = plný charakter negativu, 0 = neutrální „ideální“ negativ. |
| **Print Strength** | 1 = plný print, 0 = negativ přes neutrální DRT bez printu. |

### Primaries (na světle scény, před negativem)
| Parametr | Co dělá |
|---|---|
| **Exposure** | Expozice ve stopách. |
| **Contrast / Pivot** | Kontrast kolem pivotu (ve stopách vůči 18% šedé). Mění jas, ne sytost. |
| **Highlights / Shadows** | Zvednutí nebo stažení světel a stínů (až ±1,5 stopy). |
| **Temperature K / Tint** | Vyvážení bílé chromatickou adaptací (CAT02): 6500 K = beze změny, nižší = chladnější, vyšší = teplejší. Tint: + = purpurová, − = zelená. |
| **Saturation** | Sytost scény. |
| **Skin Hue / Skin Saturation** | Odstín a sytost jen v pásmu pleti. |

### Negativ
| Parametr | Co dělá |
|---|---|
| **Push Pull** | Push/pull vyvolání (−2 až +3): push zvedá kontrast a ubírá kresbu ve stínech, pull opačně. |
| **Color Density** | Sytost barev v negativu (1 = stock, 0 = černobílá). |
| **Interimage** | Vzájemné ovlivňování vrstev (DIR efekt), kalibrované na ColorChecker ze skutečného skenu Vision3 250D. 1 = kalibrace, **0 = jen technické listy** (ve Film Labu *Negative Version = Old*), 2 = výraznější. |
| **Neutral Negative Curve** | Stejná křivka pro všechny vrstvy, bez barevného crossoveru. |
| **Negative Bleach Bypass** | Stříbro zůstane v negativu: víc kontrastu, méně barev. |

### Print
| Parametr | Co dělá |
|---|---|
| **Print Exposure** | Světlost kopie v printer points (12 bodů = 1 clona). + = světlejší. |
| **Printer Light R / G / B** | Barevné korekce laboratoře. + = víc dané barvy. |
| **Print Contrast** | Násobič gammy printu. |
| **Print Crosstalk** | Vazba mezi vrstvami 2383 nafitovaná na ColorChecker ze skutečného printu. 1 = kalibrace, **0 = jen technický list** (ve Film Labu *Print Version = Old*). |
| **Dye Saturation, Dye Sat Cyan / Magenta / Yellow** | Sytost barviv printu, celkově a po barvivech (azurové = červený kanál, purpurové = zelený, žluté = modrý). |
| **Black Toe** | + = zvednuté, měkčí černé · − = hlubší černé. |
| **Shadow / Highlight Roll-off** | Měkčí (+) nebo tvrdší (−) přechod do černé a do bílé. |
| **Neutral Print Curve** | Stejná křivka printu pro všechny vrstvy. |
| **Print Bleach Bypass** | Stříbro v printu (0–1): hluboké černé, tvrdý kontrast, vybledlé barvy. Obraz ztmavne, dorovnej ho přes Print Exposure. |

### Projekce a výstup
| Parametr | Co dělá |
|---|---|
| **Projection Flare** | Zvedne černé jako rozptyl světla v kině. |
| **Flare Tint Hue / Amount** | Barva zvednutých černých (35 = zlatá, 195 = azurová). |
| **HDR Peak Luminance / HDR Grey nits** | Pro PQ / HLG: jas bílé a jas 18% šedé v nitech. |
| **Show Curve** | Vykreslí vlevo dole tónovou křivku nodu (R, G, B) od −8 do +8 stop. Svislá čára je 18% šeď. |

### Originální 2383 LUT z Resolve
V Emulsion Film nastav **DRT = Off – Cineon Log** a do dalšího nodu dej LUT *Film Looks → Rec709 Kodak 2383 D65*. Dostaneš negativ z pluginu a print z Resolve.

## Emulsion Texture: ovládání

| Parametr | Co dělá |
|---|---|
| **Strength** | Celková síla všech textur. |
| **MTF Softness** | Filmová měkkost jemných detailů. |
| **Acutance / Acutance Radius** | Zvýraznění hran z vyvolávání: kontury vypadají výrazně, i když je obraz měkký. |
| **Red Layer Softness** | Červená vrstva leží v emulzi nejhlouběji, a je proto nejměkčí. |
| **Halation Amount / Radius / Threshold / Warmth** | Červenooranžová záře kolem světel. Threshold je jas na výstupu (0–1). |
| **Bloom Amount / Radius / Threshold** | Rozptyl světla (difuze / Pro-Mist), zachovává energii. |
| **Grain Stock / Film Format** | Charakter zrna (50D až Eastman 5294) a formát (65 mm, 35 mm, Super 16, Super 8): velikost zrna, MTF a halace vůči obrazu. |
| **Grain Amount / Size / Color** | Síla, velikost a barevnost zrna (Color 0 = monochromatické). |
| **Animate Grain / Grain Seed** | Zrno se mění s obrazem. Vypni pro statický náhled; Seed dává jinou variantu. |
| **Film Breath / Gate Weave / Vignette** | Kolísání expozice mezi snímky, mikropohyb obrazu v okénku, pokles světla do rohů. |
| **Display Gamma** | Gamma vstupu nodu (nové): Rec.709 2.4, sRGB 2.2 nebo P3 2.6, podle výstupu Emulsion Film. |
| **Quality** | Vzorky pro halaci a bloom (Low při gradingu, High pro render). |

Velikosti se počítají relativně k šířce obrazu, takže look vypadá stejně v HD i 4K.

## Emulsion LUT

1. Svoje LUTy přejmenuj na `slot01.cube` až `slot10.cube` a nahraď jimi soubory ve složce `Emulsion_LUTs`. Prázdné sloty nic nedělají.
2. *Update Lists* nebo restart Resolve (po každé výměně LUTu).
3. V nodu vyber **LUT Slot** a **Intensity**. **Bypass** LUT vypne.

LUT dostane přesně to, co do nodu přijde. LUT pro Rec.709 patří za Emulsion Film, LUT pro log / DWG před něj.

## Recepty

Výchozí body, ne oficiální nastavení z produkce.

- **Teplé, zlaté exteriéry:** Vision 5246 250D · 2383 · Print Exposure −1, Printer Light R +2, G +1, B −2 · Color Density 1.1 · Texture: Grain *Vision / EXR 500T*, Halation 0.8, Bloom 0.2
- **Čisté, syté:** Vision3 50D · 2393 · Color Density 1.2 · Printer Light R +1, B −1 · Texture: Grain *50D* 0.4, Halation 0.5
- **80. léta:** Eastman 5294 400T (noc) / ECN II 5247 (den) · 2383 · Texture: Grain *Eastman 5294* 1.4, Color 0.7 · Halation 1.3 · Film Breath 0.3 · Gate Weave 0.2 · Vignette 0.4
- **Noční město / CineStill:** Vision3 500T 5219 no rem-jet · Texture: Halation 2–3, Radius 2, Threshold 0.7 · Grain 1.2
- **Bleach bypass:** Vision3 5219 · Print Bleach Bypass 0.6–1.0 · Print Exposure +3 až +5 · Dye Saturation 0.8

## Co je jinak než ve Film Labu

- **Stejná barevná věda.** Při stejném nastavení dává Emulsion stejný obraz jako Film Lab Color v3 a Texture v2 (ověřuje to test, viz níže).
- **Negative Version / Print Version** jsou nahrazené posuvníky **Interimage** a **Print Crosstalk**. Hodnota 0 = *Old*, 1 = *New*, a dá se jít i mezi nimi nebo nad 1.
- **Negative Strength** při DRT *Neutral* a *Off* už neskáče v polovině rozsahu. Při 0 dává přesně obraz bez negativu.
- **Texture** má nový přepínač **Display Gamma** (dřív napevno 2.4).
- **Kód** je rozdělený do modulů v `Emulsion_lib/` (vstup, primaries, negativ, print, výstup, textura). Tabulky dat generuje skript a stocky jsou v jedné tabulce místo dlouhé řady podmínek.

## Vývoj

```
plugin/            to, co se kopíruje do Resolve
  Emulsion_lib/    core.h, input.h, grade.h, negative.h, print.h, output.h, texture.h
                   film_data.h: GENEROVANÝ soubor, needitovat ručně
tools/build_data.py   vygeneruje film_data.h z dat Kodaku v ../tools (numpy + scipy)
test/                 testy bez Resolve: DCTL se přeloží jako C++ a spustí na CPU
```

- **Testy:** `python3 test/test_emulsion.py` (potřebuje `g++` a `numpy`). Testy zkontrolují zdrojáky (literály s `f`, nic, co GPU nepřeloží), porovnají Emulsion s Film Labem napříč stocky, printy, výstupy a náhodným nastavením všech posuvníků, a ověří šeď na LAD, monotónní křivky, spojitost, HDR, krajní hodnoty, zrno a LUTy.
- **Nová data:** uprav JSON ve `../tools/` nebo konstanty v `tools/build_data.py` a spusť `python3 tools/build_data.py`.
- `test/shim.h` napodobuje runtime DCTL jen pro CPU. Plugin je potřeba vyzkoušet i v Resolve (CUDA / Metal / OpenCL).
