// =============================================================================
//  Emulsion: display rendering and output encoding
//
//  Needs the Output combo values OUT_*.
// =============================================================================

// neutral DRT: hue-preserving tonescale on max(RGB), 18% grey -> SDR grey (as
// on the print), highlights roll off and desaturate towards white
__DEVICE__ float3 neutral_drt(float3 c)
{
    c = max3f(c, 0.0f);
    float n = _fmaxf(_fmaxf(c.x, c.y), c.z);
    if (n < 1e-7f) return f3(0.0f);
    float p = _powf(n, 1.2f);
    float t = 1.05f * p / (p + 1.039f);
    c = scale3(c, t / n);
    float Y = luma2020(c);
    float k = 1.0f - 0.6f * smooth01(0.6f, 1.05f, t);
    return make_float3(Y + (c.x - Y) * k, Y + (c.y - Y) * k, Y + (c.z - Y) * k);
}

// SDR-relative light -> nits: below grey a plain scale, above it the range
// opens up so that SDR white lands on the HDR peak
__DEVICE__ float3 hdr_expand(float3 L, float peak, float grey)
{
    float Y = luma2020(L);
    if (Y <= 1e-7f) return scale3(L, grey / SDR_GREY);
    float y = _logf(Y / SDR_GREY);
    float yw = _logf(1.0f / SDR_GREY);
    const float a = 8.0f;
    float k = (_logf(peak / grey) - yw) * a / (softplus_e(a * yw) - 0.69314718f);
    float f = y + k * (softplus_e(a * y) - 0.69314718f) / a;     // f(0) = 0: grey stays on `grey`
    return scale3(L, grey * _expf(f) / Y);
}

__DEVICE__ float pq_encode(float nits)
{
    float y = _powf(clampf(nits / 10000.0f, 0.0f, 1.0f), 0.1593017578125f);
    return _powf((0.8359375f + 18.8515625f * y) / (1.0f + 18.6875f * y), 78.84375f);
}

__DEVICE__ float hlg_oetf(float e)
{
    if (e <= 1.0f / 12.0f) return _sqrtf(3.0f * _fmaxf(e, 0.0f));
    return 0.17883277f * _logf(12.0f * e - 0.28466892f) + 0.55991073f;
}

// pull negative components toward luminance (keeps hue, no clipping skew)
__DEVICE__ float3 gamut_compress(float3 o, float Y)
{
    float mn = _fminf(o.x, _fminf(o.y, o.z));
    if (mn < 0.0f && Y > 0.0f) o = mix3(f3(Y), o, Y / (Y - mn));
    return o;
}

__DEVICE__ int is_hdr(int out) { return out == OUT_PQ || out == OUT_HLG; }

// display light (linear Rec.2020, SDR white = 1) -> output code values
__DEVICE__ float3 encode_output(float3 L, int out, float peak, float grey)
{
    float Y = luma2020(L);
    if (is_hdr(out)) {
        float3 n = max3f(hdr_expand(gamut_compress(L, Y), peak, grey), 0.0f);
        if (out == OUT_PQ) return make_float3(pq_encode(n.x), pq_encode(n.y), pq_encode(n.z));
        // HLG: undo the reference OOTF for this peak, then the OETF
        float g = 1.2f + 0.42f * _log10f(peak / 1000.0f);
        float3 d = scale3(n, 1.0f / peak);
        float3 sc = scale3(d, _powf(_fmaxf(luma2020(d), 1e-7f), 1.0f / g - 1.0f));
        return make_float3(hlg_oetf(sc.x), hlg_oetf(sc.y), hlg_oetf(sc.z));
    }
    float3 o;
    if (out == OUT_P3) o = mul3(L, 1.34357825f, -0.28217967f, -0.06139858f, -0.06529745f, 1.07578792f, -0.01049046f, 0.00282179f, -0.01959849f, 1.01677671f);
    else o = mul3(L, 1.66049100f, -0.58764114f, -0.07284986f, -0.12455047f, 1.13289990f, -0.00834942f, -0.01815076f, -0.10057890f, 1.11872966f);
    o = clamp3(gamut_compress(o, Y), 0.0f, 1.0f);
    float gm = 1.0f / 2.4f;
    if (out == OUT_SRGB) gm = 1.0f / 2.2f;
    else if (out == OUT_P3) gm = 1.0f / 2.6f;
    return make_float3(_powf(o.x, gm), _powf(o.y, gm), _powf(o.z, gm));
}

// ---- Show Curve: the node's tone curve, drawn bottom left over the picture

typedef struct { int inside; float fx, fy, w, h; } CurveBox;

__DEVICE__ CurveBox curve_box(int on, int W, int H, int X, int Y)
{
    CurveBox b;
    b.w = 0.32f * (float)W; b.h = 0.30f * (float)H;
    float bx = 0.03f * (float)W, by = (float)H - 0.04f * (float)H - b.h;
    b.fx = ((float)X - bx) / b.w;
    b.fy = 1.0f - ((float)Y - by) / b.h;
    b.inside = on && b.fx >= 0.0f && b.fx <= 1.0f && b.fy >= 0.0f && b.fy <= 1.0f;
    return b;
}

// scene grey ramp, -8 to +8 stops across the box
__DEVICE__ float curve_stops(CurveBox b) { return -8.0f + 16.0f * b.fx; }

__DEVICE__ float3 curve_plot(CurveBox b, float3 res)
{
    float stops = curve_stops(b);
    float3 px = f3(0.08f);
    float gx = _fabs(stops - 2.0f * _floorf(stops * 0.5f + 0.5f)) * b.w / 16.0f;     // grid every 2 stops
    float gy = _fabs(b.fy * 4.0f - _floorf(b.fy * 4.0f + 0.5f)) * b.h / 4.0f;         // and every 25 %
    if (gx < 0.6f || gy < 0.6f) px = f3(0.18f);
    if (_fabs(stops) * b.w / 16.0f < 0.8f) px = f3(0.32f);                            // 18% grey
    float w = 1.6f / b.h;
    if (_fabs(res.z - b.fy) < w) px = make_float3(0.25f, 0.45f, 1.0f);
    if (_fabs(res.y - b.fy) < w) px = make_float3(0.2f, 0.9f, 0.3f);
    if (_fabs(res.x - b.fy) < w) px = make_float3(1.0f, 0.25f, 0.2f);
    return px;
}
