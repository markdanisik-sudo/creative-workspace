# Film Lab: Kodak Vision DCTL pro DaVinci Resolve

Emulace filmového negativu Kodak / Eastman (Vision, Vision2, Vision3, EXR, ECN II) a kopírovacího materiálu (Kodak 2383 / 2393). Součástí je halace, bloom, filmové zrno, „breath“, gate weave a vinětace, a to všechno v jednom DCTL souboru s ovládacími prvky přímo v Resolve.

> Vyžaduje **DaVinci Resolve Studio** (DCTL s UI a čtením sousedních pixelů).

## Instalace

1. Zkopíruj `FilmLab_Kodak.dctl` do složky LUT:
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT/`
   - **Linux:** `/opt/resolve/LUT/`
2. V Resolve: *Project Settings → Color Management → Lookup Tables → Update Lists* (nebo Resolve restartuj).
3. Na Color page přidej na node **ResolveFX → DCTL** a v menu *DCTL List* vyber `FilmLab_Kodak`.

## Kam ho dát v node tree

Plugin pracuje **scénicky lineárně**, stejně jako skutečný film: světlo → negativ → print → projekce. Proto:

- **Vstup** je log materiál z kamery (vyber ho v `Input`) nebo DaVinci Wide Gamut / Intermediate, pokud používáš color-managed workflow nebo máš před ním CST.
- **Výstup** je hotový obraz pro displej (Rec.709 / sRGB / P3). Plugin tedy patří na **konec** node tree a nahrazuje výstupní transformaci (LUT / CST na Rec.709).
- Primární korekce (expozice, vyvážení bílé, kontrast) dělej v nodech **před** pluginem, v logu. Chová se to pak jako práce kameramana a laborky.
- Pokud zvolíš `Print Stock = None`, dostaneš jen negativ převedený zpět do DWG/DI. Můžeš pak použít vlastní print LUT nebo výstupní transformaci.

Typický strom: `[CST/Input] → [Balance] → [Look / secondary] → [FilmLab_Kodak]`

Při timeline v ACES nebo DWG s automatickou správou barev nastav v Resolve výstup na DWG/Intermediate (žádné tone mappingy) a plugin nech udělat výstupní transformaci. Jinak by se křivka aplikovala dvakrát.

## Ovládání

| Parametr | Co dělá |
|---|---|
| **Input** | Vstupní barevný prostor a gamma (DWG/DI, LogC3, LogC4, S-Log3, V-Log, Log3G10, Rec.709). |
| **Negative Stock** | 23 negativů: Vision3 5203 / 5207 / 5213 / 5219 (+ 5219 bez rem-jetu ve stylu CineStill), Vision2 5201 / 5205 / 5212 / 5217 / 5218 / 5229 Expression, Vision 5246 / 5274 / 5277 / 5279 / 5289, Eastman ECN II 5247, Eastman 5294, Eastman EXR 5245 / 5248 / 5293 / 5296 / 5298. |
| **Print Stock** | Kodak Vision 2383 (klasický distribuční print), Vision Premier 2393 (kontrastnější, hlubší černé, sytější), nebo None. |
| **Output** | Rec.709 Gamma 2.4 (TV/grading), sRGB 2.2 (web), P3-D65 2.6 (kino/HDR mastering). |
| **Film Format** | 65 mm / 35 mm / Super 16 / Super 8. Mění velikost a viditelnost zrna a velikost halace. |
| **Negative Exposure** | Expozice negativu ve stopách (jako nad/podexpozice na place). Mění i to, jak film „žere“ světla a stíny. |
| **Color Density** | Sytost barev v denzitě filmu. 1 = charakter stocku, 0 = černobílá, >1 = hutnější barvy. |
| **Print Exposure** | Světlost kopie v printer points (12 bodů = 1 clona expozice printu, na obrazovce je 1 bod ≈ 0,2 EV). + = světlejší. |
| **Printer Light R/G/B** | Barevné korekce laboratoře v printer points. + = víc dané barvy. Nejpřirozenější způsob, jak „otočit“ celkovou barvu. |
| **Print Contrast** | Násobič gammy printu. |
| **Projection Flare** | Lehce zvedne černé jako rozptyl světla v kině. |
| **Halation Amount / Radius / Threshold / Warmth** | Červenooranžová záře kolem světel. Threshold je ve stopách nad 18% šedí. Warmth přidává zelenou složku (červená → oranžová). |
| **Bloom Amount / Radius / Threshold** | Rozptyl světla (difuzní filtr / Pro-Mist). Zachovává energii: světla se rozlijí, nic se „nepřisvětlí“ navíc. Nízký threshold (např. −4) = difuze celého obrazu. |
| **Grain Amount / Size / Color** | Zrno v denzitě negativu, takže je přirozeně nejvíc vidět ve středních tónech. Color 0 = monochromatické, 1 = plně barevné po vrstvách. |
| **Animate Grain / Grain Seed** | Zrno se mění s každým snímkem. Vypni pro statický náhled; Seed dává jinou variantu. |
| **Film Breath** | Jemné kolísání expozice a barev mezi snímky. |
| **Gate Weave** | Mikropohyb obrazu v okénku kamery/projektoru. |
| **Vignette** | Pokles světla do rohů (ve stopách). |
| **Quality** | Počet vzorků pro halaci a bloom (Low = rychlé při gradingu, High = finální render). |

Velikosti halace, bloomu a zrna se počítají relativně k šířce obrazu, takže look vypadá stejně v HD i 4K.

## Recepty pro looky

Jsou to výchozí body, které jsem odvodil z toho, jak tyto snímky vypadají. Nejde o oficiální nastavení z produkce. **Pán prstenů** (2001–2003) se točil na 35mm film Kodak. **Hobit**, **Rings of Power** a **Stranger Things** se točily digitálně a filmový look dostaly až v gradingu, což je přesně případ, na který je tenhle nástroj určený.

### Pán prstenů: Kraj / Lothlórien (teplé, zlaté)
- Negative: **Vision 5246 250D** (exteriéry) / **Vision 5279 500T** (noc, interiéry)
- Print: **2383**, Print Exposure −1, Printer Light R +2, G +1, B −2
- Color Density 1.1 · Grain 1.0 · Halation 0.8 · Bloom 0.2, Threshold 0.5
- Pro Moria / Mordor: Color Density 0.6, Printer Light B +2, R −1, Print Contrast 1.1

### Hobit (čisté, sytější, teplé)
- Negative: **Vision3 5203 50D** · Print: **2393**
- Color Density 1.2 · Grain 0.4 · Halation 0.5 · Bloom 0.15
- Printer Light R +1, B −1

### Rings of Power (měkká světla, bohaté barvy, jemná difuze)
- Negative: **Vision3 5207 250D** · Print: **2383**
- Color Density 1.15 · Grain 0.35 · Halation 0.6, Radius 1.3
- Bloom 0.3, Radius 2.0, Threshold −1 (jemná difuze celého obrazu)
- Print Contrast 0.95, Projection Flare 0.5

### Stranger Things (80. léta, teplé interiéry, viditelné zrno)
- Negative: **Eastman 5294 400T** (noc, interiéry) / **Eastman ECN II 5247** (den), tedy stocky, které se v 80. letech opravdu používaly · Print: **2383**
- Color Density 1.05 · Grain 1.4, Color 0.7 · Halation 1.3, Threshold 1.0
- Bloom 0.25 · Film Breath 0.3 · Gate Weave 0.2 · Vignette 0.4
- Noční scény: Printer Light B +2, G +1 (azurová noc), Negative Exposure −0.5

### Noční město / CineStill
- Negative: **Vision3 500T 5219 no rem-jet** · Print: **2383**
- Halation 1.0–2.0, Threshold 1.0 · Grain 1.2

## Eastman vs. Kodak a staré stocky

Kodak prodává kinematografické negativy pod značkou **Eastman** (na okraji filmu je natištěno „EASTMAN“). Číslo určuje formát: **52xx** = 35 mm (a 65 mm), **72xx** = 16 mm. Jde o stejné emulze, takže *Kodak Vision3 7219* dostaneš jako 5219 + **Film Format → Super 16**.

Stocky z doby před řadou Vision (seřazené od nejstarších):

| Stock | Éra | Charakter |
|---|---|---|
| ECN II 5247 (100T) | 70.–80. léta | krátký rozsah ve světlech, hutné teplé barvy, výraznější halace |
| 5294 (400T) | 80. léta | rychlý, zrnitý, měkčí barvy |
| EXR 5245 / 5248 / 5293 | konec 80. a 90. léta | jemnější zrno, pořád kratší rozsah než Vision |
| EXR 5296 (500T) | konec 80. a 90. léta | noční stock své doby |
| EXR 5298 (500T) | 90. léta | kontrastnější a „punchovější“ než 5296 |

## Jak to funguje

1. **Dekódování vstupu** do scénicky lineárního světla (primáry Rec.2020).
2. **Bloom a halace** se počítají ze světla scény *před* negativem, tedy tam, kde vznikají fyzicky. Halace se přidává hlavně do červené vrstvy (světlo odražené od podložky filmu).
3. **Negativ:** každá vrstva má vlastní charakteristickou křivku (H&D) s toe, rovnou částí a ramenem. Rozdíly gammy mezi vrstvami tvoří typický barevný „crossover“ (např. chladnější stíny u 500T). Interimage efekt přidává filmovou hutnost barev.
4. **Zrno** se přidává do denzity každé vrstvy. Díky tomu je přirozeně nejvíc vidět ve středních tónech a málo v hlubokých stínech a světlech.
5. **Print:** světlo prošlé negativem exponuje kopírovací materiál přes printer lights. Křivka printu (2383/2393) dává filmový kontrast, hutné černé a měkký přechod světel do bílé.
6. **Výstup:** převod do cílového gamutu s jemnou kompresí přesycených barev.

Parametry stocků jsou **parametrické aproximace** veřejně známého charakteru jednotlivých materiálů (kontrast, latitude, barevnost, zrnitost), nikoli měřená spektrální data. Ber je jako výchozí bod a dolaď je podle sebe.

## Tipy

- Na 18% šedou kartu by měla vyjít hodnota ~0.46 (Rec.709). Když je obraz moc tmavý, uprav **Negative Exposure** nebo **Print Exposure**, ne Gain v jiném nodu za pluginem.
- Pro plynulý grading nech Quality na **Low**, před renderem přepni na **High**.
- Zrno vždy posuzuj v plném rozlišení (100% zoom), v náhledu viewer zrno zmenšuje a průměruje.
