# Film Lab v4: audit, model and validation

Film Lab Color v4 (`FilmLab_Color.dctl`) replaces v3. The v3 files are kept in
`backup/` (`FilmLab_Color_v3.dctl`, `FilmLab_Texture_v2.dctl`), and the commit
is tagged `filmlab-v3-backup`.

Tags used throughout:
- **[M]** digitised from Kodak's published graphs
- **[D]** mathematically derived
- **[F]** fitted
- **[E]** estimated (no data)
- **[V]** verified in this work against an independent implementation (colour-science 0.4)

## 1. What the audit found in v3, and what v4 does about it

| # | v3 problem | Evidence | v4 |
|---|---|---|---|
| 1 | Canon Log 2 / 3 decoded with a legal-range conversion in the wrong direction: grey −0.09 or −0.20 stops, highlights up to +2 stops off | [V] against colour-science | Fixed. All log formulas take code / 1023; the *Input Data Levels* option covers legal-scaled data (see section 6) |
| 2 | Scene → layer exposure by a 3×3 matrix: 8–13 % mean error; 21–26 % of narrow-band (LED) colours gave non-positive red- or blue-layer exposure | [D] on 4000 held-out spectra | Degree-3 root polynomial: 95th percentile error 1.9–2.1 → 1.2–1.3 stops, non-positive exposures only in the red layer, in 14 % of LED spectra [D/F] |
| 3 | Daylight balance light was a 5500 K blackbody (up to 57 % off D55 in the blue); CIE 1931 from an approximation (1.4 %) | [V] | CIE D-series and the CIE 1931 table (`tools/cie_standard.json`) |
| 4 | 500T used the 250D dyes although its own dye data was digitised | data in `v_500t.json` | 500T uses its own dyes and base [M] |
| 5 | 2383 fit switched shape at the mid point (0.006–0.012 D step); the DCTL used a different (averaged) curve | [D] | One smooth Richards curve per layer, fitted on the data (RMS 0.006–0.008 D) |
| 6 | The 2383 "gamma" quoted earlier (4.74 / 4.08 / 3.54) is the fit steepness, not density gamma | [M] | Real chord gamma D 0.5 → 3.0: R 3.84, G 3.37, B 3.48 (fit: 3.81 / 3.35 / 3.51) |
| 7 | Interimage on log exposure before the curve; scaled by an arbitrary 0.6 | — | On exposure-equivalent density after development (fades in toe and shoulder); refitted with leave-one-out validation [F] |
| 8 | Print cross-talk fitted with scripts whose modules are missing; "New" made the print match worse (ΔE00 4.71 vs 4.33) | — | Reproducible fit (`tools/fit_calibration.py`); v4 default ΔE00 3.77 |
| 9 | Halation and grain added to the display image after the print | — | Halation in the negative's exposure; grain in the negative's density [E amounts] |
| 10 | Push / pull: gamma + toe shift only; the print was retimed on the pushed negative, so push never brightened anything | — | Development model (gamma, toe speed, fog, grain); printer lights set for a normally developed negative [E coefficients] |
| 11 | Saturation, Color Density and Dye Saturation overlapped; scene Contrast / Highlights / Shadows duplicated the film curves | — | Separate concepts (section 4); grading tools removed from the film node |
| 12 | 200T listed like a measured stock | no Kodak data for 5213 | Labelled *estimated* in the UI |

Removed controls, and what to use instead:

| Removed | Use instead |
|---|---|
| Contrast, Pivot, Highlights, Shadows, Saturation, Skin | Grade before the node, in log |
| Color Density | Film Saturation |
| Negative / Print Version | Interimage and Print Crosstalk at 0 or 1 |
| Negative / Print Strength | Strength |
| Neutral curves, Black Toe, roll-offs | None; these were shape edits without data |
| Vision2 / Vision / EXR / ECN stocks | Still in the v3 backup |

## 2. Data sources and what each parameter is

| Item | Source | Class |
|---|---|---|
| Negative H&D curves 50D, 250D (Status M) | H-1-5203, H-1-5207, ~900 points per layer | M, fitted RMS 0.003–0.006 D |
| Negative H&D curves 500T | VISION3 500T brochure, ~80 points per layer | M (coarse), fitted RMS 0.004–0.010 D |
| 200T (5213) | none | E: 500T spectra, hand-set curves |
| Spectral sensitivity 50D / 250D / 500T / 2383 | data sheets (log sensitivity); outside the plotted range −0.08 log/nm | M (extrapolation E) |
| Dyes 250D, 500T, 2383 | data sheets; values outside the plot held constant or zero | M (edges E) |
| 2383 H&D (Status A) | H-1-2383, 639 points per layer | M; D-min 0.05 / 0.05 / 0.09 below the digitised range (E); D-max above 4.06 extrapolated (E) |
| LAD 1.09 / 1.06 / 1.03 | Kodak laboratory aim density | M (not re-checked against the PDF in this session) |
| Status M / A densitometers | Gaussian bands; Status A centres set so the LAD patch is neutral under the projector | F (no ISO 5-3 tables available) |
| Printer lamp 3200 K, projector 5800 K | blackbody approximations | E |
| CIE 1931, CIE daylight | CIE 015 tables | standard |
| Layer exposure map | root polynomial fitted over 4000 synthetic natural reflectances | D/F |
| Interimage, print cross-talk | ColorChecker scan / print | F (section 5) |
| Push / pull, fog, grain, halation amounts, 2393, D60 / D55, bleach bypass, flare | no data | E |

Digitising accuracy of the graphs is about ±0.01–0.02 D. The stops axis of the negative curves is anchored at the "normal grey exposure" chosen during digitising. That anchor should be checked against the PDFs.

## 3. Processing order (and why)

1. **Camera log → scene-linear Rec.2020** (decoder per camera, gamut matrix).
2. **Exposure and white balance.** They act on the light before the film, as a lens stop and a filter or camera balance do.
3. **Layer exposure** of the stock under its balance light: 3200 K tungsten or D55.
4. **Halation.** It is light reflected from the base re-exposing the red (and a little the green) layer, so it changes exposure before development. Only the departure from a uniform field is added, because the Kodak curves already include the halation of uniform patches.
5. **Development:** the H&D curve per layer, plus push / pull.
6. **Interimage.** It happens during development, on density.
7. **Film Saturation, then layer density.**
8. **Grain.** It is the density of the negative's dye clouds. It then passes through the print curve, which makes it strongest in the midtones automatically.
9. **Printing** through the negative's spectral transmission (36 bands), timed so a normally exposed, normally developed grey prints to LAD. Printer lights are applied here.
10. **2383 H&D per layer and print dye saturation.**
11. **Projection** through the print dyes → CIE 1931 → D65 → output encoding.

**MTF, bloom, breath, weave and vignette** stay in `FilmLab_Texture.dctl` on the display image. That is an approximation for MTF. A DCTL cannot run the colour chain for the 100+ neighbours an MTF kernel needs.

## 4. Concepts that v4 keeps apart

| Concept | Meaning | Where in v4 |
|---|---|---|
| **Optical density** | What a densitometer reads (Status M on the negative, Status A on the print) | Every density in the model is Status M or A |
| **Spectral dye density** | A dye's density as a function of wavelength, per unit amount: fixed Kodak data | Tables `NEG_DYE_*`, `PRINT_DYE_*` |
| **Dye amount / layer density** | How much dye a layer formed | **Layer Density C / M / Y**: dye amount above base; the lab re-times grey, so it changes the crossover, not the grey balance |
| **Film Saturation** | Each layer's departure from the density it would have for a neutral of the same visual exposure, after development | **Film Saturation**: greys untouched; depends on exposure automatically (little effect in toe and shoulder) [D] |
| **Interimage** | Layers inhibiting each other during development | **Interimage**: 1 = fitted (section 5) |
| **Print dye saturation** | The same idea on the 2383 densities | **Print Dye Saturation** |

## 5. ColorChecker: calibration, not validation

The data is 24 patches at one exposure, in 8-bit sRGB, through an unknown scanner (250D) and an unknown camera (the 2383 print photo). It cannot characterise spectral response. Both sets are used for fitting, so the honest estimate of generalisation is leave-one-out over the 18 chromatic patches (`tools/fit_calibration.py`, `tools/calibration_v4.json`).

**250D scan, interimage shape:**

| | In-sample ΔE00 | Leave-one-out ΔE00 |
|---|---|---|
| No interimage | 6.67 | 7.05 |
| With interimage | 3.91 | 4.97 |

Interimage generalises.

**2383 print** (chromatic ΔE00, in-sample / leave-one-out):

| Interimage strength | No cross-talk | With cross-talk |
|---|---|---|
| 0 | 3.22 / 3.39 | 2.65 / 3.16 |
| 0.6 | 5.27 / 5.56 | 2.63 / 3.12 |
| 1 | 6.97 / 7.36 | 2.61 / 3.10 |

The print alone cannot determine interimage strength: cross-talk cancels it.

**Default:** interimage 1 (the scan supports it) plus cross-talk fitted at that strength. This is the only setting consistent with both data sets. The print's black patch (ΔE00 about 16) is lifted in the photo, most likely by flare in the photograph.

**Through the DCTLs** (`tools/validate_colorchecker.py`, in-sample):

| Version | ΔE00 vs 2383 print |
|---|---|
| v3 Old | 4.33 |
| v3 New | 4.71 |
| v4 without calibration | 4.19 |
| **v4 default** | **3.77** |

## 6. Canon C50 (Canon Log 2 / Cinema Gamut)

**Verified [V]:**
- Cinema Gamut → Rec.2020 matrix: exact (5e-9).
- Canon Log 2 / 3 decoding: matches colour-science in the DCTL harness (`tests/test_filmlab.py`).

**Not verifiable outside Resolve:** whether Resolve hands the DCTL code / 1023 (default *Input Data Levels = Full*) or legal-range video scaled to 0–1 (*Video*).

**1-minute check in Resolve:**
1. On a Canon Log 2 clip, put Resolve's *Color Space Transform* (Canon Cinema Gamut / Canon Log 2 → DaVinci WG / DaVinci Intermediate) on one node.
2. On a parallel node, put Film Lab with DRT *Off – negative scan to DWG / Intermediate*, Negative Stock *None*, Strength 1.
3. The Levels setting whose output matches the CST on a grey card is the right one.

## 7. Validation

**Numerical,** in `tests/test_filmlab.py` (`python3 dctl/tests/test_filmlab.py`, needs g++, numpy, scipy, colour-science):
- Negative curves through the DCTL vs the digitised Kodak curves for 50D / 250D / 500T: RMS < 0.012 D, max < 0.035 D per layer.
- 2383 fit vs data, and no step anywhere on the curve.
- Canon Log 2 / 3, other decoders and Cinema Gamut vs colour-science.
- The whole colour chain, DCTL vs the Python reference model (`tools/filmlab_model.py`), on ColorChecker colours at three exposures, for every stock and most controls: < 0.003 code.
- **Exposure:** a pure scaling of scene light; underexposure reaches the toe for every stock.
- **Push:**
  - It raises gamma 8–16 % per stop.
  - It is not an exposure shift.
  - 1 stop under + push 1 prints near normal grey.
- **Film Saturation:**
  - It does nothing at 1.
  - Greys stay untouched.
  - Its effect fades deep in the toe.
- **Layer Density** keeps the grey neutral.
- **Tone:** monotonic for every stock, print and push.
- **Halation:**
  - It leaves flat fields untouched.
  - It glows red around lights only.
  - It is stronger without rem-jet.
- **Grain:** unbiased; heavier for 500T than 50D, with push, and on smaller formats.

**Visual only:**
- Grain texture and size against real scans.
- Halation shape and colour.
- Overall rendering of skin, foliage and sky.
- The look of 200T, 2393, D60 / D55, bleach bypass and flare (all [E]).

**Needed to go further:**
1. The Kodak PDFs, for re-checking D-min, LAD and the grey anchor; H-1-5213 for 200T; the full H-1-5219.
2. ISO 5-3 Status A / M spectral products, and the printer-lamp and xenon spectra.
3. C50 Canon Log 2 footage of a ColorChecker (ideally the SG version) at −4…+4 stops, in daylight and tungsten, for independent validation of input and exposure.
4. The same scene on real 250D / 500T: processed normally and pushed +1 / +2, step wedges or sensitometric strips, printed on 2383 or scanned with a known calibration. This is what push / pull, grain and halation need to stop being estimates.
