# Film Lab: node tree pro DaVinci Resolve

Doporučené pořadí 10 nodů. Pracovní prostor do filmového nodu je **DaVinci Wide Gamut / DaVinci Intermediate**, za ním už je obraz pro displej (Rec.709 Gamma 2.4).

Nastavení projektu: *Color Science = DaVinci YRGB* (bez automatické správy barev), *Timeline / Output color space = Rec.709 Gamma 2.4*. Převod z kamery dělá node 01, výstupní transformaci node 08.

| # | Label | Co v něm je | Prostor |
|---|---|---|---|
| 01 | **CST IN** | ResolveFX *Color Space Transform*: Input = tvoje kamera (např. Canon Cinema Gamut / Canon Log 2), Output = DaVinci Wide Gamut / DaVinci Intermediate, Tone Mapping = None | kamera → DWG/DI |
| 02 | **EXPOZICE + WB** | Primaries: Offset / HDR wheels (expozice), Temp / Tint | DWG/DI |
| 03 | **KONTRAST** | Contrast + Pivot, Custom Curves | DWG/DI |
| 04 | **SECONDARY** | Hue vs Hue / Hue vs Sat, Qualifier (pleť, nebe, zeleň) | DWG/DI |
| 05 | **WINDOWS** | Power Windows: přisvětlení subjektu, vinětace | DWG/DI |
| 06 | **LUT LOG** | DCTL *FilmLab_LUT_Library*: pro LUTy, které čekají log / DWG / Cineon vstup (ve výchozím stavu Bypass) | DWG/DI |
| 07 | **HALACE** | ResolveFX *Halation* (Studio): Processing Color Space = DaVinci Wide Gamut / Intermediate, preset Modern / Vintage níže | DWG/DI (světlo scény) |
| 08 | **FILM** | DCTL *FilmLab_Color*: Input DaVinci Wide Gamut + DaVinci Intermediate, Vision3 50D / 250D / 500T, Print 2383, Output Rec.709 Gamma 2.4 | DWG/DI → Rec.709 |
| 09 | **LUT 709** | DCTL *FilmLab_LUT_Library*: pro běžné kreativní LUTy (Rec.709 vstup) | Rec.709 |
| 10 | **GRAIN** | ResolveFX *Film Grain* (Studio), preset níže. Volitelně za něj DCTL *FilmLab_Texture* (jen MTF, halaci a zrno v něm vypni) | Rec.709 |

## Proč je to v tomhle pořadí

- **Korekce (02–05) jsou před filmem**, v logu. Film pak dostane už vyvážené světlo, jako na place.
- **Halace (07) je před filmem.** Ve skutečném filmu vzniká ve světle, které se odrazí od podložky do emulze, tedy *před* negativem. Když projde filmovou křivkou, má správnou barvu a měkký přechod.
- **Zrno (10) je na konci.** Leží na hotovém obraze a není ho pak „rozmazané“ dalšími korekcemi ani LUTem.
- **LUT podle toho, co čeká na vstupu.** To je nejčastější chyba:
  - LUT pro **Rec.709** (většina kreativních LUTů z internetu, LUTy pro „hotový“ obraz) → **node 09**, za filmem.
  - LUT pro **log / DWG / Cineon** (např. film print LUTy, LUTy výrobců kamer) → **node 06**, před filmem. Pokud LUT dělá i převod na Rec.709 (má v názvu „to Rec709“), nahrazuje film: v FilmLab_Color pak dej *DRT = Off – DWG/Intermediate* nebo node 08 vypni.
  - Když je LUT na špatném místě, obraz je buď vybledlý a šedý (log LUT na Rec.709 obraze), nebo přepálený a přesycený (Rec.709 LUT na logu).

## Knihovna LUTů (FilmLab_LUT_Library)

1. Do složky LUT v Resolve zkopíruj `FilmLab_LUT_Library.dctl` **a celou složku `FilmLab_LUTs`** (musí ležet vedle DCTL).
2. Svoje LUTy přejmenuj na `slot01.cube` až `slot10.cube` a nahraď jimi soubory ve složce `FilmLab_LUTs`. Prázdné sloty jsou neutrální (nic nedělají).
3. *Project Settings → Color Management → Lookup Tables → Update Lists*, případně restart Resolve (po každé výměně LUTu).
4. V nodu vybereš **LUT Slot** a nastavíš **Intensity** (0 = bez LUTu, 1 = plný LUT). **Bypass** LUT vypne.

Do pluginu nejde LUT „nahrát“ tlačítkem: DCTL si LUTy načítá ze souborů při kompilaci. Proto jsou pevné názvy slotů. Zapiš si, který LUT je ve kterém slotu.

## Halace (ResolveFX Halation): Modern vs. Vintage

Výchozí body. Jména parametrů odpovídají Resolve 18–19, v novějších verzích se mohou mírně lišit.

| | **Modern** (Vision3 s anti-halační vrstvou, čisté, jen kolem světel) | **Vintage** (starší stocky / tisky, CineStill, teplá záře) |
|---|---|---|
| Isolation → Threshold | vysoko: jen lampy, slunce, odlesky | níž: i světlé plochy |
| Dye Layer Reflections → Strength | ~0,25–0,35 | ~0,6–0,8 |
| Dye Layer Reflections → Spread | ~0,30–0,40 | ~0,5–0,7 |
| Relative Spread (R / G / B) | R 1,2 · G 0,8 · B 0,3 | R 1,8 · G 1,0 · B 0,3 |
| Saturation | střední | vyšší (červenooranžová) |
| Secondary Glow | vypnuto | zapnuto, slabě (měkký opar kolem) |

Tip: zapni *View Isolated Region* a zvedej Threshold, dokud na obličeji nezůstane skoro nic. Halace se má držet jen jasných světel.

## Zrno (ResolveFX Film Grain)

| | **Modern 35 mm** (Vision3 50D / 250D) | **Vintage / 16 mm** (500T, starší filmy) |
|---|---|---|
| Preset | 35mm | 16mm |
| Opacity / síla | ~0,25–0,35 | ~0,5–0,7 |
| Velikost zrna | výchozí | o něco větší |

Zrno posuzuj při 100% zoomu: v malém náhledu ho viewer průměruje.

## Alternativa: originální 2383 z Resolve

Místo nodu 08 (FilmLab_Color) můžeš použít vestavěný print LUT:
- node 08a: *Color Space Transform* DWG/DI → **Cineon Film Log**,
- node 08b: LUT *Film Looks → Rec709 Kodak 2383 D65*.

Nebo FilmLab_Color s *DRT = Off – Cineon Log* a za něj ten LUT. Dostaneš tak negativ Vision3 z pluginu a print z Resolve.
