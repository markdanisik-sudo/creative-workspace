// =============================================================================
//  Emulsion: the print (Kodak 2383 / 2393) and its projection
//
//  printer lamp light through the negative's dyes (spectral) -> exposure of
//  the 2383 layers -> timing to the laboratory aim density -> printer lights
//  -> Status A characteristic curves -> dye saturation -> projection through
//  the print dyes with a xenon lamp -> CIE 1931 -> Rec.2020 display light
//
//  Needs film_data.h and the Print Stock combo values PR_*.
// =============================================================================

#define PT 0.025f               // one printer point in log exposure (12 points = 1 stop of print exposure)

typedef struct {
    int stock;
    float crosstalk;            // 2383 cross-talk fitted on a real print (0 = data sheet only)
    float exposure, lightR, lightG, lightB, contrast;
    float dyeSat, dyeC, dyeM, dyeY;
    float blackToe, shadowRoll, highlightRoll, bleach;
    int neutral;
    float flare, flareHue, flareTint;
    float strength;
} PrintCtl;

typedef struct { float dmin, dmax, x0, g, s, hl, sh; } PrintCurve;

// light from the printer lamp through the negative, seen by the 2383 layers
__DEVICE__ float3 printer_exposure(float3 D, float silver)
{
    float3 a = mul3(sub3(D, make_float3(NEG_DMIN_M)), NEG_AINV);
    float3 H = f3(0.0f);
    for (int i = 0; i < NWL; i++) {
        float t = exp10_f(-(a.x * NEG_DYE_C[i] + a.y * NEG_DYE_M[i] + a.z * NEG_DYE_Y[i] + silver));
        H.x += PRINT_W_R[i] * t; H.y += PRINT_W_G[i] * t; H.z += PRINT_W_B[i] * t;
    }
    return max3f(H, 1e-12f);
}

// 2383 characteristic curve (Status A density vs log exposure): a generalised
// logistic.  The roll-offs stretch the highlight (t < 0) and shadow (t > 0)
// side, which keeps the curve continuous and monotonic.
__DEVICE__ float print_curve(float x, PrintCurve c)
{
    float t = (x - c.x0) * c.g;
    t = t < 0.0f ? t / c.hl : t / c.sh;
    return c.dmin + (c.dmax - c.dmin) / _powf(1.0f + _expf(-t / c.s), c.s);
}

__DEVICE__ float print_curve_inv(float D, PrintCurve c)
{
    D = clampf(D, c.dmin + 1e-4f, c.dmax - 1e-4f);
    float r = (c.dmax - c.dmin) / (D - c.dmin);
    float t = -c.s * _logf(_powf(r, 1.0f / c.s) - 1.0f);
    t = t < 0.0f ? t * c.hl : t * c.sh;
    return c.x0 + t / c.g;
}

__DEVICE__ PrintCurve make_curve(float dmin, float dmax, float x0, float g, float toe, float shoulder, PrintCtl c)
{
    float3 avg = make_float3(PRINT_CURVE_AVG);
    PrintCurve p;
    p.dmin = dmin; p.dmax = dmax; p.x0 = x0; p.g = g; p.s = 0.5f * (toe + shoulder);
    if (c.neutral) { p.g = avg.x; p.s = 0.5f * (avg.y + avg.z); }
    if (c.stock == PR_2393) { p.g *= 1.08f; p.dmax += 0.45f; }        // more contrast, denser blacks
    p.g *= c.contrast;
    p.hl = _fmaxf(1.0f + 0.6f * c.highlightRoll, 0.3f);
    p.sh = _fmaxf(1.0f + 0.8f * c.shadowRoll, 0.3f);
    p.dmax = _fmaxf(p.dmax - 1.2f * c.blackToe, 1.8f);
    return p;
}

// projection flare: stray light lifts the blacks, optionally tinted
__DEVICE__ float3 projection_flare(float3 L, float flare, float hue, float tint)
{
    if (flare <= 0.0f) return L;
    float h = hue / 360.0f;
    float3 hc = make_float3(clampf(_fabs(h * 6.0f - 3.0f) - 1.0f, 0.0f, 1.0f),
                            clampf(2.0f - _fabs(h * 6.0f - 2.0f), 0.0f, 1.0f),
                            clampf(2.0f - _fabs(h * 6.0f - 4.0f), 0.0f, 1.0f));
    hc = scale3(hc, 1.0f / _fmaxf(luma2020(hc), 1e-3f));
    float3 fl = scale3(add3(f3(1.0f - tint), scale3(hc, tint)), flare * 0.002f);
    return make_float3((L.x + fl.x) / (1.0f + fl.x), (L.y + fl.y) / (1.0f + fl.y), (L.z + fl.z) / (1.0f + fl.z));
}

// negative -> projected print light (linear Rec.2020, clear print = 1)
__DEVICE__ float3 print_film(Negative n, PrintCtl c)
{
    PrintCurve pr = make_curve(PRINT_CURVE_R, c);
    PrintCurve pg = make_curve(PRINT_CURVE_G, c);
    PrintCurve pb = make_curve(PRINT_CURVE_B, c);
    float3 lad = make_float3(LAD);

    // timing: 18% grey prints to the laboratory aim density; printer lights
    // are offsets from there (+ = brighter / more of that colour)
    float3 H = printer_exposure(n.D, n.silver);
    float3 Hg = printer_exposure(n.Dg, n.silverG);
    float3 e = make_float3(_log10f(H.x / Hg.x), _log10f(H.y / Hg.y), _log10f(H.z / Hg.z));
    e = couple(e, c.crosstalk, PRINT_XTALK);
    float Dr = print_curve(e.x + print_curve_inv(lad.x, pr) + PT * (c.exposure + c.lightR), pr);
    float Dg = print_curve(e.y + print_curve_inv(lad.y, pg) + PT * (c.exposure + c.lightG), pg);
    float Db = print_curve(e.z + print_curve_inv(lad.z, pb) + PT * (c.exposure + c.lightB), pb);

    // dye saturation: each layer's departure from a visual neutral of the same
    // density (cyan = red channel, magenta = green, yellow = blue)
    float Dn = (Dr + Dg + Db) * (1.0f / 3.0f);
    float on = mean3(lad);
    Dr = Dn + (lad.x - on) + (Dr - Dn - (lad.x - on)) * c.dyeSat * c.dyeC;
    Dg = Dn + (lad.y - on) + (Dg - Dn - (lad.y - on)) * c.dyeSat * c.dyeM;
    Db = Dn + (lad.z - on) + (Db - Dn - (lad.z - on)) * c.dyeSat * c.dyeY;

    // dye amounts above the print base, then projection through the dyes;
    // print bleach bypass leaves silver in proportion to the density
    float3 a = mul3(sub3(make_float3(Dr, Dg, Db), make_float3(PRINT_DMIN_A)), PRINT_AINV);
    float silver = c.bleach > 0.0f ? 0.6f * c.bleach * _fmaxf(Dn - 0.06f, 0.0f) : 0.0f;
    float3 L = f3(0.0f);
    for (int i = 0; i < NWL; i++) {
        float t = exp10_f(-(a.x * PRINT_DYE_C[i] + a.y * PRINT_DYE_M[i] + a.z * PRINT_DYE_Y[i] + silver));
        L.x += PROJ_R[i] * t; L.y += PROJ_G[i] * t; L.z += PROJ_B[i] * t;
    }

    // D60 / D55: the same print under a warmer projector white
    if (c.stock == PR_2383D60) L = make_float3(L.x, L.y * 0.951f, L.z * 0.875f);
    else if (c.stock == PR_2383D55) L = make_float3(L.x, L.y * 0.895f, L.z * 0.746f);
    return projection_flare(L, c.flare, c.flareHue, c.flareTint);
}
