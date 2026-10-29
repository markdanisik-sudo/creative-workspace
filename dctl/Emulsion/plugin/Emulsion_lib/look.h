// =============================================================================
//  Emulsion: the look
//
//  scene light -> DaVinci Wide Gamut -> per channel in DaVinci Intermediate:
//  contrast and print crossover around 18% grey -> S curve -> display light
//  -> output gamut -> fade (lifted, cool blacks) -> output gamma
//
//  The S curve is fitted on the Cinesumer tone curve (a generalised
//  logistic over DaVinci Intermediate code values, 18% grey -> 0.28).  The
//  crossover is the contrast ratio of the Kodak 2383 layers (Status A gamma
//  R 4.74, G 4.08, B 3.54): cyan shadows, warm highlights, neutral grey.
// =============================================================================

#define DI_GREY     0.33604327f     // 18% grey in DaVinci Intermediate
#define CURVE_U0    0.3776f         // S curve: mid point, steepness, toe / shoulder shape
#define CURVE_K     13.1f
#define CURVE_S     1.3803f
#define CURVE_F0    0.00684407f     // S(0), so that code 0 -> black
#define XOVER_R     1.16244610f     // 2383 layer gamma / green layer gamma
#define XOVER_B     0.86757889f
#define FADE_R      0.024f          // lifted black of the Cinesumer frames, display code
#define FADE_G      0.035f
#define FADE_B      0.043f

typedef struct {
    float crossover, saturation, warmth, contrast;
} Look;

// Look combo: print crossover amount, saturation, warmth (Temperature
// offset), contrast.  L_* values come from the plugin's DEFINE_UI_PARAMS.
__DEVICE__ Look make_look(int id)
{
    Look l;
    l.crossover = 0.35f; l.saturation = 0.85f; l.warmth = 0.0f; l.contrast = 1.0f;     // L_PRINT
    if (id == L_DAY)        { l.crossover = 0.30f; l.saturation = 0.92f; l.warmth = 0.12f; l.contrast = 0.96f; }
    else if (id == L_NIGHT) { l.crossover = 0.42f; l.saturation = 0.80f; l.warmth = -0.15f; l.contrast = 1.05f; }
    else if (id == L_BLEACH){ l.crossover = 0.15f; l.saturation = 0.55f; l.warmth = 0.0f; l.contrast = 1.18f; }
    else if (id == L_NEUTRAL){ l.crossover = 0.0f; l.saturation = 1.0f; l.warmth = 0.0f; l.contrast = 1.0f; }
    return l;
}

// DI code value -> display code value (gamma 2.4)
__DEVICE__ float s_curve(float u)
{
    float f = _powf(1.0f + _expf(-(u - CURVE_U0) * (CURVE_K / CURVE_S)), -CURVE_S);
    return clampf((f - CURVE_F0) / (1.0f - CURVE_F0), 0.0f, 1.0f);
}

// one channel: contrast (and crossover) around grey, then the curve
__DEVICE__ float tone_channel(float lin, float slope)
{
    float u = lin_to_di(_fmaxf(lin, -0.0075f));
    return s_curve(DI_GREY + (u - DI_GREY) * slope);
}

__DEVICE__ float3 scene_to_dwg(float3 c)
{
    return mul3(c, 0.89211212f, 0.02436918f, 0.08351870f, 0.03261660f, 0.78613752f, 0.18124588f, 0.06997705f, 0.10474949f, 0.82527346f);
}

// scene light (Rec.2020) -> display light in DWG primaries (white = 1)
__DEVICE__ float3 tone_map(float3 E, float contrast, float crossover)
{
    float3 d = scene_to_dwg(E);
    float kr = contrast * (1.0f + crossover * (XOVER_R - 1.0f));
    float kb = contrast * (1.0f + crossover * (XOVER_B - 1.0f));
    float3 code = make_float3(tone_channel(d.x, kr), tone_channel(d.y, contrast), tone_channel(d.z, kb));
    return make_float3(_powf(code.x, 2.4f), _powf(code.y, 2.4f), _powf(code.z, 2.4f));
}

// pull negative components toward luminance (keeps hue, no clipping skew)
__DEVICE__ float3 gamut_compress(float3 o, float Y)
{
    float mn = _fminf(o.x, _fminf(o.y, o.z));
    if (mn < 0.0f && Y > 0.0f) {
        float t = Y / (Y - mn);
        o = make_float3(Y + (o.x - Y) * t, Y + (o.y - Y) * t, Y + (o.z - Y) * t);
    }
    return o;
}

// display light (DWG primaries) -> output code values, with the fade
__DEVICE__ float3 encode_output(float3 L, int out, float fade)
{
    float3 o;
    float Y;
    if (out == OUT_P3) {
        o = mul3(L, 1.53154371f, -0.38718496f, -0.14435875f, -0.10031767f, 1.41325474f, -0.31293708f, -0.09046195f, -0.19316357f, 1.28362552f);
        Y = 0.2289746f * o.x + 0.6917385f * o.y + 0.0792869f * o.z;
    } else {
        o = mul3(L, 1.89861490f, -0.79217618f, -0.10643872f, -0.16894879f, 1.48897575f, -0.32002697f, -0.12153916f, -0.31567585f, 1.43721501f);
        Y = 0.2126f * o.x + 0.7152f * o.y + 0.0722f * o.z;
    }
    o = clamp3(gamut_compress(o, Y), 0.0f, 1.0f);
    // fade: blacks lift to a cool grey (measured in display code, gamma 2.4)
    float3 c = make_float3(_powf(o.x, 1.0f / 2.4f), _powf(o.y, 1.0f / 2.4f), _powf(o.z, 1.0f / 2.4f));
    float3 lift = scale3(make_float3(FADE_R, FADE_G, FADE_B), fade);
    c = make_float3(lift.x + c.x * (1.0f - lift.x), lift.y + c.y * (1.0f - lift.y), lift.z + c.z * (1.0f - lift.z));
    if (out == OUT_709) return c;
    float g = out == OUT_SRGB ? 2.4f / 2.2f : 2.4f / 2.6f;     // same display light at another gamma
    return make_float3(_powf(c.x, g), _powf(c.y, g), _powf(c.z, g));
}
