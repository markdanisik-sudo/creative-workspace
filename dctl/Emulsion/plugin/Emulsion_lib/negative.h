// =============================================================================
//  Emulsion: the camera negative
//
//  scene light -> exposure of the three layers (spectral sensitivity of the
//  stock under its balance light) -> interimage coupling -> colour separation
//  -> Status M characteristic curve per layer (push / pull, bleach bypass)
//
//  Needs film_data.h.
// =============================================================================

typedef struct {
    float3 dmin, g, xt, kt, emax, ks;   // density = dmin + g * hd(log E): base, gamma, toe, toe softness, shoulder, shoulder softness
    int sens;                           // spectral sensitivity set: 0 = 50D, 1 = 250D, 2 = 500T, 3 = ideal
    float cd;                           // colour separation of the stock (Vision3 = 1)
} NegStock;

typedef struct {
    float pushPull, colorDensity, interimage, strength;
    int neutral, bleach;
} NegCtl;

typedef struct {
    float3 D, Dg;              // Status M density of the pixel and of 18% grey (printer timing)
    float silver, silverG;     // retained silver (bleach bypass), neutral density
    float3 Ds, Dgs, g;         // the stock alone and its layer gammas (for scans)
    float strength;            // how much of the stock (vs the ideal negative)
    int sens;
} Negative;

__DEVICE__ float3 stock3(int o) { return make_float3(STOCKS[o], STOCKS[o + 1], STOCKS[o + 2]); }

__DEVICE__ NegStock neg_stock(int id)
{
    int o = clampi(id, 0, NSTOCK - 1) * STOCK_STRIDE;
    NegStock s;
    s.dmin = stock3(o);      s.g = stock3(o + 3);     s.xt = stock3(o + 6);
    s.kt = stock3(o + 9);    s.emax = stock3(o + 12); s.ks = stock3(o + 15);
    s.sens = (int)(STOCKS[o + 18] + 0.5f);
    s.cd = STOCKS[o + 19];
    return s;
}

// scene Rec.2020 <-> layer exposure, per spectral set
__DEVICE__ float3 to_layers(float3 c, int set)
{
    int o = set * 9;
    return make_float3(SENS[o] * c.x + SENS[o + 1] * c.y + SENS[o + 2] * c.z,
                       SENS[o + 3] * c.x + SENS[o + 4] * c.y + SENS[o + 5] * c.z,
                       SENS[o + 6] * c.x + SENS[o + 7] * c.y + SENS[o + 8] * c.z);
}

__DEVICE__ float3 from_layers(float3 c, int set)
{
    int o = set * 9;
    return make_float3(SENS_INV[o] * c.x + SENS_INV[o + 1] * c.y + SENS_INV[o + 2] * c.z,
                       SENS_INV[o + 3] * c.x + SENS_INV[o + 4] * c.y + SENS_INV[o + 5] * c.z,
                       SENS_INV[o + 6] * c.x + SENS_INV[o + 7] * c.y + SENS_INV[o + 8] * c.z);
}

// push / pull: development time changes contrast and shadow speed; a neutral
// curve gives all three layers the same shape (no colour crossover)
__DEVICE__ NegStock develop(NegStock s, float pp, int neutral)
{
    s.g = scale3(s.g, 1.0f + 0.12f * pp);
    s.xt = add3(s.xt, f3(0.07f * pp));
    if (neutral) {
        s.g = f3(mean3(s.g)); s.xt = f3(mean3(s.xt)); s.kt = f3(mean3(s.kt));
        s.emax = f3(mean3(s.emax)); s.ks = f3(mean3(s.ks));
    }
    return s;
}

// exposure-equivalent density: straight line through the toe point with a
// soft toe and a soft shoulder at emax (multiply by gamma for density)
__DEVICE__ float hd_curve(float x, float xt, float kt, float emax, float ks)
{
    float e = kt * softplus10((x - xt) / kt);
    return e - ks * softplus10((e - emax) / ks);
}

// scene light -> Status M densities
__DEVICE__ float3 neg_density(float3 E, NegStock s, float cd, float ii)
{
    float3 e = to_layers(E, s.sens);
    float3 x = make_float3(_log10f(_fmaxf(e.x, 1e-7f) / GREY), _log10f(_fmaxf(e.y, 1e-7f) / GREY), _log10f(_fmaxf(e.z, 1e-7f) / GREY));
    if (s.sens != 3) x = couple(x, ii, INTERIMAGE);
    // colour density: separation of the layer exposures (1 = stock, 0 = monochrome)
    float k = cd * s.cd;
    float xm = 0.2627f * x.x + 0.6780f * x.y + 0.0593f * x.z;
    x = make_float3(xm + k * (x.x - xm), xm + k * (x.y - xm), xm + k * (x.z - xm));
    return make_float3(s.dmin.x + s.g.x * hd_curve(x.x, s.xt.x, s.kt.x, s.emax.x, s.ks.x),
                       s.dmin.y + s.g.y * hd_curve(x.y, s.xt.y, s.kt.y, s.emax.y, s.ks.y),
                       s.dmin.z + s.g.z * hd_curve(x.z, s.xt.z, s.kt.z, s.emax.z, s.ks.z));
}

// the stock, blended in density with an ideal, colour-neutral negative
// (Negative Strength: 1 = stock, 0 = ideal)
__DEVICE__ Negative expose_negative(float3 E, NegStock s, NegCtl c)
{
    NegStock id = neg_stock(NSTOCK - 1);
    float t = clampf(c.strength, 0.0f, 1.0f);
    Negative n;
    n.Ds = neg_density(E, s, c.colorDensity, c.interimage);
    n.Dgs = neg_density(f3(GREY), s, c.colorDensity, c.interimage);
    n.g = s.g;
    n.D = n.Ds; n.Dg = n.Dgs;
    if (t < 1.0f) {
        n.D = mix3(neg_density(E, id, 1.0f, 0.0f), n.Ds, t);
        n.Dg = mix3(neg_density(f3(GREY), id, 1.0f, 0.0f), n.Dgs, t);
    }
    n.strength = t;
    n.sens = s.sens;
    n.silver = 0.0f; n.silverG = 0.0f;
    if (c.bleach) {
        // skipped bleach: silver stays with the dyes, about half their density
        n.silver = 0.5f * _fmaxf(mean3(sub3(n.D, s.dmin)), 0.0f);
        n.silverG = 0.5f * _fmaxf(mean3(sub3(n.Dg, s.dmin)), 0.0f);
    }
    return n;
}

// negative -> scene light along each layer's straight line (a "scan"); the
// toe, shoulder and crossover of the stock stay in.  The ideal negative has
// nothing of its own to add, so Negative Strength blends with the scene light.
__DEVICE__ float3 scan_negative(Negative n, float3 E)
{
    if (n.sens == 3 || n.strength <= 0.0f) return E;
    float3 e = make_float3(GREY * exp10_f((n.Ds.x - n.Dgs.x) / n.g.x),
                           GREY * exp10_f((n.Ds.y - n.Dgs.y) / n.g.y),
                           GREY * exp10_f((n.Ds.z - n.Dgs.z) / n.g.z));
    float3 scan = from_layers(e, n.sens);
    return n.strength >= 1.0f ? scan : mix3(E, scan, n.strength);
}

// Cineon printing density: 0.002 D per code value, 18% grey on 445
__DEVICE__ float3 negative_to_cineon(Negative n)
{
    return make_float3((445.0f + (n.D.x - n.Dg.x) / 0.002f) / 1023.0f,
                       (445.0f + (n.D.y - n.Dg.y) / 0.002f) / 1023.0f,
                       (445.0f + (n.D.z - n.Dg.z) / 0.002f) / 1023.0f);
}
