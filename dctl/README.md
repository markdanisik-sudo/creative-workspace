# Film Lab: Kodak / Eastman film emulace pro DaVinci Resolve

Emulace filmového negativu Kodak / Eastman (Vision, Vision2, Vision3, EXR, ECN II) a kopírovacího materiálu (Kodak 2383 / 2393). Plugin má dva DCTL nody:

| Soubor | Co dělá |
|---|---|
| `FilmLab_Color.dctl` | Barva a tonalita: vstup z kamery, primaries (expozice, kontrast, teplota, …), negativ, print / DRT a výstup |
| `FilmLab_Texture.dctl` | Textura filmu: MTF (kresba), halace, bloom, zrno, breath, gate weave a vinětace |
| `FilmLab_LUT_Library.dctl` + složka `FilmLab_LUTs` | Knihovna 10 vlastních LUTů s posuvníkem intenzity |

**Doporučený node tree (10 nodů) a nastavení vestavěné halace a zrna:** viz [`NODE_TREE.md`](NODE_TREE.md).

> Vyžaduje **DaVinci Resolve Studio**.
>
> `FilmLab_Kodak.dctl` je původní verze 1 (všechno v jednom nodu). Zůstává tu kvůli kompatibilitě, pro novou práci používej dvojici Color + Texture.

## Instalace

1. Zkopíruj `FilmLab_Color.dctl` a `FilmLab_Texture.dctl` do složky LUT:
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/`
   - **Linux:** `/opt/resolve/LUT/`
2. V Resolve: *Project Settings → Color Management → Lookup Tables → Update Lists* (nebo Resolve restartuj).
3. Na Color page přidej na node **ResolveFX → DCTL** a v menu *DCTL List* vyber plugin.

## Pořadí nodů

```
[Balance / secondary v logu] → [FilmLab Color] → [FilmLab Texture] → výstup
```

- **FilmLab Color** dostává log z kamery (nastav *Input Color Space* a *Input Gamma*) nebo DaVinci WG / Intermediate. Výstupem je hotový obraz pro displej, takže nahrazuje výstupní LUT nebo CST.
- **FilmLab Texture** jde hned za něj a pracuje s jeho výstupem. Nemá vlastní nastavení barevného prostoru a počítá s **SDR výstupem** (Rec.709 / sRGB / P3). Pro HDR výstup (PQ / HLG) se nehodí.
- Při color-managed timeline (DWG, ACES) nastav výstupní transformaci timeline tak, aby nic netonemapovala (DWG/Intermediate), jinak se křivka použije dvakrát.

## FilmLab Color: ovládání

> **Pořadí v Resolve:** Resolve řadí ovládání DCTL podle typu, ne podle pořadí v kódu. Nahoře jsou všechny **posuvníky**, pod nimi **zaškrtávátka** a úplně dole **rozbalovací menu** (Input Color Space, Input Gamma, Negative Stock, DRT, Print Stock, Output). Tabulky níže jsou seřazené podle významu.

### Hlavička
| Parametr | Co dělá |
|---|---|
| **Input Color Space / Input Gamma** | Gamut a gamma kamery zvlášť: DaVinci WG, ARRI WG3 / WG4, S-Gamut3.Cine, V-Gamut, RED WG, **Canon Cinema Gamut**, Rec.709, Rec.2020 · DaVinci Intermediate, LogC3, LogC4, S-Log3, V-Log, Log3G10, **Canon Log 2 / 3**, Gamma 2.4, Linear, **Cineon Log** (scan filmu). |
| **Negative Stock** | 23 negativů (Vision3, Vision2, Vision, Eastman EXR / ECN II) nebo **None – print only**: obraz jde rovnou na print (samotný 2383 bez Vision3). **Vision3 50D, 250D a 500T jsou spektrální modely z technických listů Kodaku** (viz níže), ostatní stocky používají spektrální data Vision3 se svou vlastní tonalitou. |
| **DRT** | **Film Print** (použije Print Stock) · **Neutral** (vlastní neutrální DRT: měkké rameno, zachovaný odstín, SDR i HDR) · **Off – DWG/Intermediate** (scénický výstup pro vlastní výstupní transformaci) · **Off – Cineon Log** (pro originální 2383 LUT z Resolve, viz níže). |
| **Print Stock** | Kodak **2383 D65 / D60 / D55**: spektrální model z technického listu 2383, varianty se liší jen bílou projekce (D60 a D55 jsou teplejší) · Kodak 2393 (2383 s vyšším kontrastem a hlubšími černými). |
| **Output** | Rec.709 Gamma 2.4 · sRGB 2.2 · P3-D65 2.6 · **Rec.2100 PQ** · **Rec.2100 HLG** (HDR, gamut Rec.2020). |
| **Strength** | Síla filmu: 1 = plný film, 0 = stejný obraz přes neutrální DRT bez filmu. |
| **Negative Strength** | Síla emulace negativu: 1 = plný charakter stocku, 0 = neutrální „ideální“ negativ (jen print). |
| **Print Strength** | Síla emulace printu: 1 = plný 2383 / 2393, 0 = negativ přes neutrální DRT bez printu. |

### Primaries
| Parametr | Co dělá |
|---|---|
| **Exposure** | Expozice ve stopách (před negativem, jako na place). |
| **Contrast / Pivot** | Kontrast kolem pivotu (Pivot je ve stopách vůči 18% šedé). Mění jas, ne sytost. |
| **Highlights / Shadows** | Zvednutí nebo stažení světel a stínů (až ±1,5 stopy). |
| **Temperature K / Tint** | Vyvážení bílé **chromatickou adaptací (CAT02)**, stejně jako v kameře: 6500 K = beze změny, nižší hodnota = chladnější obraz, vyšší = teplejší. Tint: + = purpurová, − = zelená. |
| **Saturation** | Sytost scény před filmem. |

### Negativ
| Parametr | Co dělá |
|---|---|
| **Push Pull** | Push/pull vyvolání (−2 až +3): push zvedá kontrast a sytost a ubírá kresbu ve stínech, pull opačně. |
| **Color Density** | Sytost barev v denzitě negativu (1 = stock, 0 = černobílá). |
| **Neutral Negative Curve** | Stejná křivka pro všechny vrstvy: bez barevného crossoveru, barevnost stocku zůstane. |
| **Negative Bleach Bypass** | Stříbro zůstane v negativu: víc kontrastu, méně barev. |

### Print
| Parametr | Co dělá |
|---|---|
| **Print Exposure** | Světlost kopie v printer points (12 bodů = 1 clona expozice printu, na obrazovce 1 bod ≈ 0,2 EV). + = světlejší. |
| **Printer Light R/G/B** | Barevné korekce laboratoře. + = víc dané barvy. |
| **Print Contrast** | Násobič gammy printu. |
| **Dye Saturation** | Sytost všech barviv printu jedním posuvníkem. |
| **Dye Sat Cyan / Magenta / Yellow** | Sytost každého barviva zvlášť. Azurové barvivo tvoří červený kanál (červené tóny a jejich protějšek, azurové), purpurové zelený (zeleň, purpur), žluté modrý (modrá, žlutá). |
| **Black Toe** | + = zvednuté, měkčí černé · − = hlubší černé. |
| **Shadow Roll-off** | + = měkčí přechod stínů do černé · − = tvrdší. |
| **Highlight Roll-off** | + = delší, měkčí přechod světel do bílé · − = kratší, tvrdší. |
| **Neutral Print Curve** | Stejná křivka printu pro všechny vrstvy (bez crossoveru printu). |
| **Print Bleach Bypass** | Stříbro v printu (0–1): hluboké černé, tvrdý kontrast, vybledlé barvy (*Se7en*, *Zachraňte vojína Ryana*). Obraz ztmavne, dorovnej ho Print Exposure. |

### Pleť, projekce a výstup
| Parametr | Co dělá |
|---|---|
| **Skin Hue / Skin Saturation** | Odstín a sytost jen v pásmu odstínů pleti. Zeleň a modrou nechá být. |
| **Projection Flare** | Zvedne černé jako rozptyl světla v kině. |
| **Flare Tint Hue / Amount** | Barva zvednutých černých (35 = zlatá, 195 = azurová). Bílá zůstává bílá. |
| **HDR Peak Luminance / HDR Grey nits** | Pro výstup PQ / HLG: jas bílé a jas 18% šedé v nitech. |
| **Show Curve** | Vykreslí vlevo dole tónovou křivku celého nodu (R, G, B). Vodorovně je −8 až +8 stop scény, svislá čára je 18% šeď. |

### Originální 2383 LUT z Resolve
1. V FilmLab Color nastav **DRT = Off – Cineon Log** (negativ si vyber, nebo nech *None – print only*).
2. Do **dalšího nodu** dej LUT z Resolve: *Film Looks → Rec709 Kodak 2383 D65* (název se může podle verze Resolve mírně lišit). Tyhle LUTy počítají se vstupem Cineon log, který plugin v tomto režimu vydává (18% šeď = kód 445).

## Spektrální model (Vision3 50D / 250D / 500T + 2383)

Barvy nevznikají odhadem, ale výpočtem z dat, která Kodak zveřejňuje v technických listech (H-1-5203, H-1-5207, brožura VISION3 500T, H-1-2383):

- **spektrální citlivost** vrstev negativu i printu: jak film „vidí“ jednotlivé barvy světla,
- **charakteristické křivky** (Status M pro negativ, Status A pro 2383): tonalita každé vrstvy,
- **spektrální hustota barviv** negativu i printu: jaké barvy film skutečně vytvoří.

Pro každý pixel plugin spočítá expozici vrstev negativu, hustoty a barviva negativu, světlo kopírky prošlé negativem (36 vlnových délek, 380–730 nm), expozici a barviva 2383 a nakonec světlo projektoru (xenon) prošlé printem, převedené přes CIE 1931 na barvu. Šedá 18 % se kopíruje na **laboratorní cílovou hustotu Kodaku** (LAD: Status A 1,09 / 1,06 / 1,03, vizuálně neutrální 1,0), stejně jako v laboratoři. Printer Lights jsou odchylky od tohoto nastavení.

Grafy z PDF jsou digitalizované s přesností zhruba ±0,01–0,02 hustoty. Přesnou spektrální křivku densitometrů Status A/M Kodak neuvádí, proto jsou kalibrované tak, aby LAD patch vyšel neutrální. Data a skripty jsou ve složce `tools/` (`export.py` z nich tabulky v pluginu vygeneruje znovu).

**Zvednuté, matné černé:** *Projection Flare* 1,5–2,0 (případně *Flare Tint Hue* 200 a *Amount* 0,3 pro studený nádech).

## FilmLab Texture: ovládání

| Parametr | Co dělá |
|---|---|
| **Strength** | Celková síla všech textur. |
| **MTF Softness** | Filmová měkkost jemných detailů (ostrost emulze a kopírování). |
| **Acutance / Acutance Radius** | Zvýraznění hran z vyvolávání (adjacency efekt): kontury vypadají výrazně, i když je obraz měkký. |
| **Red Layer Softness** | Červená vrstva leží v emulzi nejhlouběji, a je proto nejměkčí. |
| **Halation Amount / Radius / Threshold / Warmth** | Červenooranžová záře kolem světel. Threshold je jas na výstupu (0–1): od kterého jasu světla září. |
| **Bloom Amount / Radius / Threshold** | Rozptyl světla (difuze / Pro-Mist), zachovává energii. Nízký threshold = difuze celého obrazu. |
| **Grain Stock** | Charakter zrna: 50D, 200T, 250D, Vision3 / Vision2 / Vision 500T, 800T, Eastman 5294. |
| **Film Format** | 65 mm / 35 mm / Super 16 / Super 8: velikost zrna, MTF a halace vůči obrazu. |
| **Grain Amount / Size / Color** | Síla, velikost a barevnost zrna (Color 0 = monochromatické). Zrno je nejvíc vidět ve středních tónech. |
| **Animate Grain / Grain Seed** | Zrno se mění s každým snímkem. Vypni pro statický náhled; Seed dává jinou variantu. |
| **Film Breath / Gate Weave / Vignette** | Kolísání expozice a barev mezi snímky, mikropohyb obrazu v okénku, pokles světla do rohů. |
| **Quality** | Vzorky pro halaci a bloom (Low při gradingu, High pro render). |

Velikosti MTF, halace, bloomu a zrna se počítají relativně k šířce obrazu, takže look vypadá stejně v HD i 4K.

## Recepty pro looky

Výchozí body odvozené z toho, jak tyto snímky vypadají, ne oficiální nastavení z produkce. **Pán prstenů** (2001–2003) se točil na 35mm film Kodak, **Hobit** a **Stranger Things** digitálně s filmovým lookem z gradingu.

### Pán prstenů: Kraj / Lothlórien (teplé, zlaté)
- Color: **Vision 5246 250D** (exteriéry) / **Vision 5279 500T** (noc) · **2383** · Print Exposure −1, Printer Light R +2, G +1, B −2 · Color Density 1.1
- Texture: Grain Stock *Vision / EXR 500T*, Grain 1.0 · Halation 0.8 · Bloom 0.2
- Moria / Mordor: Color Density 0.6, Printer Light B +2, R −1, Print Contrast 1.1

### Hobit (čisté, sytější, teplé)
- Color: **Vision3 5203 50D** · **2393** · Color Density 1.2 · Printer Light R +1, B −1
- Texture: Grain Stock *50D*, Grain 0.4 · Halation 0.5 · Bloom 0.15

### Stranger Things (80. léta, teplé interiéry, viditelné zrno)
- Color: **Eastman 5294 400T** (noc, interiéry) / **Eastman ECN II 5247** (den) · **2383** · Color Density 1.05
- Texture: Grain Stock *Eastman 5294*, Grain 1.4, Color 0.7 · Halation 1.3 · Bloom 0.25 · Film Breath 0.3 · Gate Weave 0.2 · Vignette 0.4
- Noční scény: Printer Light B +2, G +1 (azurová noc), Exposure −0.5

### Noční město / CineStill
- Color: **Vision3 500T 5219 no rem-jet** · **2383**
- Texture: Halation 2.0–3.0, Halation Radius 2.0, Threshold 0.7 · Grain 1.2

### Bleach bypass (Se7en, Zachraňte vojína Ryana)
- Color: **Vision3 5219** · **2383** · Print Bleach Bypass 0.6–1.0 · Print Exposure +3 až +5 (dorovnání jasu) · Dye Saturation 0.8

## Eastman vs. Kodak a staré stocky

Kodak prodává kinematografické negativy pod značkou **Eastman** (na okraji filmu je natištěno „EASTMAN“). Číslo určuje formát: **52xx** = 35 mm (a 65 mm), **72xx** = 16 mm. Jde o stejné emulze, takže *Kodak Vision3 7219* dostaneš jako 5219 + v Texture **Film Format → Super 16**.

| Stock | Éra | Charakter |
|---|---|---|
| ECN II 5247 (100T) | 70.–80. léta | krátký rozsah ve světlech, hutné teplé barvy |
| 5294 (400T) | 80. léta | rychlý, zrnitý, měkčí barvy |
| EXR 5245 / 5248 / 5293 | konec 80. a 90. léta | jemnější zrno, kratší rozsah než Vision |
| EXR 5296 (500T) | konec 80. a 90. léta | noční stock své doby |
| EXR 5298 (500T) | 90. léta | kontrastnější a „punchovější“ než 5296 |

## Jak to funguje

1. **Vstup** se převede do scénicky lineárního světla (primáry Rec.2020).
2. **Primaries** (vyvážení bílé, expozice, tón, sytost, pleť) pracují na světle scény.
3. **Negativ:** expozice vrstev podle spektrální citlivosti stocku pod jeho vyvážením (5500 K / 3200 K), charakteristické křivky Status M, push/pull a bleach bypass. Rozdíly mezi vrstvami tvoří barevný crossover.
4. **Print:** spektrální kopírování: světlo kopírky prošlé barvivy negativu (včetně oranžové masky) exponuje vrstvy 2383, nastavení na LAD, křivky 2383, sytost barviv, bleach bypass a projekce přes barviva printu.
5. **Výstup:** převod do cílového gamutu s kompresí přesycených barev. Pro HDR se rozsah nad šedou roztáhne tak, aby bílá printu dosáhla zvoleného jasu.
6. **Texture** pak přidá kresbu filmu, světelné efekty a zrno na hotový obraz.

**Vision3 50D, 250D, 500T a 2383** jsou spočítané z dat Kodaku. **Ostatní stocky** (Vision2, Vision, EXR, ECN II) používají spektrální data Vision3 a jejich tonalita je odhad podle známého charakteru materiálu.

## Tipy

- Na 18% šedou kartu vychází ~0,41 (Rec.709), což odpovídá Kodak LAD a vizuální hustotě 1,0 v kině. Když je obraz moc tmavý, uprav **Exposure** nebo **Print Exposure**.
- Pro plynulý grading nech v Texture Quality na **Low**, před renderem přepni na **High**.
- Zrno a MTF posuzuj v plném rozlišení (100% zoom).
