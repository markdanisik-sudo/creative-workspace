// =============================================================================
//  Emulsion: primaries on scene light (before the negative, like on set)
//
//  white balance (CAT02) -> exposure -> tone (contrast, highlights, shadows)
//  -> saturation -> skin band
// =============================================================================

#define SKIN_HUE  -0.91f        // typical skin: angle in the (R-Y, B-Y)/Y plane

typedef struct {
    float exposure, contrast, pivot, highlights, shadows;
    float temp, tint, saturation, skinHue, skinSat;
} Grade;

// CIE 1960 uv of a blackbody (Krystek approximation, 1000 - 15000 K)
__DEVICE__ float3 planck_uv(float T)
{
    float u = (0.860117757f + 1.54118254e-4f * T + 1.28641212e-7f * T * T) / (1.0f + 8.42420235e-4f * T + 7.08145163e-7f * T * T);
    float v = (0.317398726f + 4.22806245e-5f * T + 4.20481691e-8f * T * T) / (1.0f - 2.89741816e-5f * T + 1.61456053e-7f * T * T);
    return make_float3(u, v, 0.0f);
}

// white point (uv) -> CAT02 cone response
__DEVICE__ float3 uv_to_lms(float3 uv)
{
    float d = 2.0f * uv.x - 8.0f * uv.y + 4.0f;
    float x = 3.0f * uv.x / d, y = 2.0f * uv.y / d;
    float3 xyz = make_float3(x / y, 1.0f, (1.0f - x - y) / y);
    return mul3(xyz, 0.7328f, 0.4296f, -0.1624f, -0.7036f, 1.6975f, 0.0061f, 0.0030f, 0.0136f, 0.9834f);
}

// the scene was lit by a T kelvin source (tint: off the blackbody locus,
// + = magenta); adapt it to the 6500 K reference, as a camera does
__DEVICE__ float3 white_balance(float3 c, float T, float tint)
{
    if (T == 6500.0f && tint == 0.0f) return c;
    float3 src = planck_uv(T);
    float3 t0 = planck_uv(T - 50.0f), t1 = planck_uv(T + 50.0f);
    float tu = t1.x - t0.x, tv = t1.y - t0.y, tl = _sqrtf(tu * tu + tv * tv);
    src.x += 0.015f * tint * tv / tl;
    src.y -= 0.015f * tint * tu / tl;
    float3 ls = uv_to_lms(src);
    float3 lr = uv_to_lms(planck_uv(6500.0f));
    float3 lms = mul3(c, 0.57961887f, 0.39268423f, -0.02307198f, -0.00223007f, 1.04932052f, -0.01168798f, 0.00548360f, 0.03726131f, 1.04468585f);
    lms = make_float3(lms.x * lr.x / ls.x, lms.y * lr.y / ls.y, lms.z * lr.z / ls.z);
    return mul3(lms, 1.72249578f, -0.64569902f, 0.03081737f, 0.00355862f, 0.95128521f, 0.01072160f, -0.00916837f, -0.03054065f, 0.95668139f);
}

// tone on luminance, in stops around mid grey; hue and saturation are kept
__DEVICE__ float3 tone(float3 c, Grade g)
{
    float Y = luma2020(c);
    if (Y <= 1e-6f || (g.contrast == 1.0f && g.highlights == 0.0f && g.shadows == 0.0f)) return c;
    float x = _log2f(Y / GREY);
    float t = g.pivot + (x - g.pivot) * g.contrast;
    t += 1.5f * g.highlights / (1.0f + _expf(-(t - 1.0f) / 0.7f));
    t += 1.5f * g.shadows / (1.0f + _expf((t + 1.5f) / 0.7f));
    return scale3(c, GREY * _exp2f(t) / Y);
}

// saturation and the skin band, on the colour-difference ratios
// a = (R - Y) / Y, b = (B - Y) / Y: brightness never changes
__DEVICE__ float3 colour(float3 c, Grade g)
{
    float Y = luma2020(c);
    if (Y <= 1e-6f) return c;
    float a = (c.x - Y) / Y * g.saturation, b = (c.z - Y) / Y * g.saturation;

    if (g.skinHue != 0.0f || g.skinSat != 1.0f) {
        // soft hue band around skin, faded out for greys and for neon colours
        float ch = _sqrtf(a * a + b * b);
        float dh = _atan2f(b, a) - SKIN_HUE;
        if (dh > 3.14159265f) dh -= 6.2831853f;
        if (dh < -3.14159265f) dh += 6.2831853f;
        float m = _expf(-0.5f * (dh / 0.30f) * (dh / 0.30f)) * smooth01(0.03f, 0.15f, ch) * (1.0f - smooth01(0.8f, 1.4f, ch));
        float ang = g.skinHue * 0.35f * m;
        float ca = _cosf(ang), sa = _sinf(ang);
        float s = 1.0f + (g.skinSat - 1.0f) * m;
        float na = (a * ca - b * sa) * s, nb = (a * sa + b * ca) * s;
        a = na; b = nb;
    }
    float r = Y * (1.0f + a), bl = Y * (1.0f + b);
    return make_float3(r, (Y - 0.2627f * r - 0.0593f * bl) / 0.6780f, bl);
}

__DEVICE__ float3 grade(float3 c, Grade g)
{
    c = white_balance(c, g.temp, g.tint);
    c = scale3(c, _exp2f(g.exposure));
    c = tone(c, g);
    return colour(c, g);
}
