// =============================================================================
//  Emulsion: negative, print and tone
//
//  scene light (Rec.2020) -> negative: exposure of the three layers from the
//  stock's spectral sensitivity, interimage coupling -> per layer, in
//  DaVinci Intermediate code: contrast around the pivot, layer density and
//  the system crossover (negative x print gamma) -> S curve -> roll-offs
//  -> display light -> output gamut -> fade -> output gamma
//
//  The S curve is fitted on the Cinesumer tone curve (generalised logistic
//  over DI code, 18% grey -> 0.28).  Stock data from Kodak's data sheets
//  (Vision3 50D H-1-5203, 250D H-1-5207, 500T, 2383 H-1-2383).
//
//  Needs the combo values NEG_*, PR_* and OUT_* from the plugin.
// =============================================================================

#define DI_GREY     0.33604327f     // 18% grey in DaVinci Intermediate
#define CURVE_U0    0.3776f         // S curve: mid point, steepness, toe / shoulder shape
#define CURVE_K     13.1f
#define CURVE_S     1.3803f
#define CURVE_F0    0.00684407f     // S(0), so that code 0 -> black
#define CURVE_GREY  0.2800f         // S(DI_GREY): where the roll-offs hinge
#define FADE_R      0.024f          // lifted black of the Cinesumer frames, display code
#define FADE_G      0.035f
#define FADE_B      0.043f

// scene Rec.2020 -> layer exposure (R, G, B sensitive), under each stock's
// balance light, neutral preserving (fitted on natural reflectances)
#define SENS_50D   1.377940f, -0.453832f, 0.075893f, -0.032467f, 1.000900f, 0.031567f, 0.059210f, -0.099070f, 1.039860f
#define SENS_250D  1.396510f, -0.483424f, 0.086919f, -0.026125f, 0.976855f, 0.049270f, 0.087790f, -0.146036f, 1.058250f
#define SENS_500T  1.375600f, -0.457989f, 0.082385f, 0.030254f, 0.956154f, 0.013592f, 0.038396f, -0.036378f, 0.997982f
// back from layers to Rec.2020, through the 250D reference (keeps each stock's own colour)
#define LAYERS_TO_2020 0.727370f, 0.348602f, -0.075973f, 0.022341f, 1.027320f, -0.049665f, -0.057258f, 0.112849f, 0.944409f
// interimage (DIR) coupling, fitted on a ColorChecker in a real Vision3 250D scan
#define INTERIMAGE 0.0097f, 0.2045f, 0.0759f, -0.0772f, 0.235f, -0.1913f

typedef struct {
    int sens;              // 0 = 50D, 1 = 250D, 2 = 500T, 3 = none
    float interimage;
    float xr, xb;          // system gamma (negative x 2383) of the red / blue layer relative to green
    float halation;        // halation gain: 1 = Vision3 with rem-jet backing
    float shadow;          // toe character (adds to Shadow Roll-off)
} NegStock;

typedef struct {
    float amount;          // how much of the system crossover the print shows
    float contrast, black; // contrast multiplier, deeper blacks (fade multiplier)
} PrintStock;

__DEVICE__ NegStock neg_stock(int id)
{
    NegStock n;
    // layer gamma, Status M (neg) x Status A (2383: R 4.745, G 4.082, B 3.541), relative to green
    n.sens = 1; n.interimage = 1.0f; n.xr = 0.9957f; n.xb = 0.8369f; n.halation = 1.0f; n.shadow = 0.0f;   // 250D
    if (id == NEG_50D || id == NEG_CS50) { n.sens = 0; n.xr = 0.9884f; n.xb = 0.8360f; n.shadow = -0.10f; }
    else if (id == NEG_500T || id == NEG_CS800) { n.sens = 2; n.xr = 1.0212f; n.xb = 0.8411f; n.shadow = 0.15f; }
    else if (id == NEG_NONE) { n.sens = 3; n.interimage = 0.0f; n.xr = 1.0f; n.xb = 1.0f; }
    // CineStill: the same emulsions without the rem-jet anti-halation backing
    if (id == NEG_CS50 || id == NEG_CS800) n.halation = 3.0f;
    return n;
}

__DEVICE__ PrintStock print_stock(int id)
{
    PrintStock p;
    p.amount = 0.5f; p.contrast = 1.0f; p.black = 1.0f;                             // 2383
    if (id == PR_2393) { p.amount = 0.55f; p.contrast = 1.08f; p.black = 0.6f; }    // 2393: more contrast, denser blacks
    else if (id == PR_NONE) { p.amount = 0.0f; }
    return p;
}

__DEVICE__ float3 scene_to_layers(float3 c, int s)
{
    if (s == 0) return mul3(c, SENS_50D);
    if (s == 1) return mul3(c, SENS_250D);
    if (s == 2) return mul3(c, SENS_500T);
    return c;
}

// DI code value -> display code value (gamma 2.4)
__DEVICE__ float s_curve(float u)
{
    float f = _powf(1.0f + _expf(-(u - CURVE_U0) * (CURVE_K / CURVE_S)), -CURVE_S);
    return clampf((f - CURVE_F0) / (1.0f - CURVE_F0), 0.0f, 1.0f);
}

// roll-offs on the display code: smooth (C1) around grey, monotonic for
// |amount| <= 1.  + = softer, longer toe / shoulder;  - = harder.
__DEVICE__ float roll_off(float y, float sh, float hl)
{
    const float m = CURVE_GREY;
    if (y < m) {
        float t = y / m;
        return y * (1.0f + 0.6f * sh * (1.0f - t) * (1.0f - t));
    }
    float w = 1.0f - y, t = w / (1.0f - m);
    return 1.0f - w * (1.0f + 0.6f * hl * (1.0f - t) * (1.0f - t));
}

typedef struct {
    float contrast, pivot, split, shadowRoll, highlightRoll;
    float3 density;
} Tone;

// one layer: interimage-coupled log exposure -> DI code -> slope around the
// pivot -> curve -> roll-offs
__DEVICE__ float tone_layer(float x, float slope, Tone t, float shadow)
{
    float u = lin_to_di(GREY * _exp2f(x));
    float y = s_curve(t.pivot + (u - t.pivot) * slope);
    return roll_off(y, clampf(t.shadowRoll + shadow, -1.0f, 1.0f), t.highlightRoll);
}

// scene light -> display light (Rec.2020 primaries, white = 1)
__DEVICE__ float3 develop_and_print(float3 E, NegStock n, PrintStock p, Tone t)
{
    float3 e = scene_to_layers(E, n.sens);
    float3 x = make_float3(_log2f(_fmaxf(e.x, 1e-6f) / GREY), _log2f(_fmaxf(e.y, 1e-6f) / GREY), _log2f(_fmaxf(e.z, 1e-6f) / GREY));
    x = couple(x, n.interimage, INTERIMAGE);

    // crossover: the print shows `amount` of the system's layer contrast
    // differences; Split Mix adds a cool-shadow / warm-highlight split
    float k = t.contrast * p.contrast;
    float kr = k * t.density.x * (1.0f + p.amount * (n.xr - 1.0f) + 0.05f * t.split);
    float kg = k * t.density.y;
    float kb = k * t.density.z * (1.0f + p.amount * (n.xb - 1.0f) - 0.16f * t.split);
    float3 y = make_float3(tone_layer(x.x, kr, t, n.shadow), tone_layer(x.y, kg, t, n.shadow), tone_layer(x.z, kb, t, n.shadow));
    float3 L = make_float3(_powf(y.x, 2.4f), _powf(y.y, 2.4f), _powf(y.z, 2.4f));
    return n.sens == 3 ? L : mul3(L, LAYERS_TO_2020);
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

// display light (Rec.2020) -> output code values, with the fade
__DEVICE__ float3 encode_output(float3 L, int out, float fade)
{
    float Y = luma2020(L);
    float3 o;
    if (out == OUT_P3) o = mul3(L, 1.34357825f, -0.28217967f, -0.06139858f, -0.06529745f, 1.07578792f, -0.01049046f, 0.00282179f, -0.01959849f, 1.01677671f);
    else o = mul3(L, 1.66049100f, -0.58764114f, -0.07284986f, -0.12455047f, 1.13289990f, -0.00834942f, -0.01815076f, -0.10057890f, 1.11872966f);
    o = clamp3(gamut_compress(o, Y), 0.0f, 1.0f);
    // fade: blacks lift to a cool grey (measured in display code, gamma 2.4)
    float3 c = make_float3(_powf(o.x, 1.0f / 2.4f), _powf(o.y, 1.0f / 2.4f), _powf(o.z, 1.0f / 2.4f));
    float3 lift = scale3(make_float3(FADE_R, FADE_G, FADE_B), fade);
    c = make_float3(lift.x + c.x * (1.0f - lift.x), lift.y + c.y * (1.0f - lift.y), lift.z + c.z * (1.0f - lift.z));
    if (out == OUT_709) return c;
    float g = out == OUT_SRGB ? 2.4f / 2.2f : 2.4f / 2.6f;     // same display light at another gamma
    return make_float3(_powf(c.x, g), _powf(c.y, g), _powf(c.z, g));
}
