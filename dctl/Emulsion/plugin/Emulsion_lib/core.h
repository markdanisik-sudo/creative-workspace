// =============================================================================
//  Emulsion: shared helpers (math, vectors, colour basics)
// =============================================================================

#define GREY      0.18f         // scene mid grey
#define SDR_GREY  0.115f        // mid grey on an SDR display (linear): 2383 LAD grey, visual density 1.0
#define LN10      2.30258509f

__DEVICE__ float clampf(float x, float a, float b) { return _fminf(_fmaxf(x, a), b); }
__DEVICE__ int clampi(int x, int a, int b) { return x < a ? a : (x > b ? b : x); }
__DEVICE__ float exp10_f(float x) { return _expf(LN10 * x); }

__DEVICE__ float smooth01(float a, float b, float x)
{
    float t = clampf((x - a) / (b - a), 0.0f, 1.0f);
    return t * t * (3.0f - 2.0f * t);
}

// log10(1 + 10^z) and ln(1 + e^z), without overflow
__DEVICE__ float softplus10(float z)
{
    if (z > 0.0f) return z + _log10f(1.0f + exp10_f(-z));
    return _log10f(1.0f + exp10_f(z));
}

__DEVICE__ float softplus_e(float z)
{
    if (z > 0.0f) return z + _logf(1.0f + _expf(-z));
    return _logf(1.0f + _expf(z));
}

// ---- float3

__DEVICE__ float3 f3(float v) { return make_float3(v, v, v); }
__DEVICE__ float3 add3(float3 a, float3 b) { return make_float3(a.x + b.x, a.y + b.y, a.z + b.z); }
__DEVICE__ float3 sub3(float3 a, float3 b) { return make_float3(a.x - b.x, a.y - b.y, a.z - b.z); }
__DEVICE__ float3 scale3(float3 a, float s) { return make_float3(a.x * s, a.y * s, a.z * s); }
__DEVICE__ float3 mix3(float3 a, float3 b, float t) { return make_float3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); }
__DEVICE__ float3 max3f(float3 a, float m) { return make_float3(_fmaxf(a.x, m), _fmaxf(a.y, m), _fmaxf(a.z, m)); }
__DEVICE__ float3 clamp3(float3 a, float lo, float hi) { return make_float3(clampf(a.x, lo, hi), clampf(a.y, lo, hi), clampf(a.z, lo, hi)); }
__DEVICE__ float mean3(float3 a) { return (a.x + a.y + a.z) * (1.0f / 3.0f); }

// 3x3 matrix (row major) times vector; pass the nine values, or a #define of them
__DEVICE__ float3 mul3(float3 c, float a, float b, float d, float e, float f, float g, float h, float i, float j)
{
    return make_float3(a * c.x + b * c.y + d * c.z,
                       e * c.x + f * c.y + g * c.z,
                       h * c.x + i * c.y + j * c.z);
}

// luminance weights of Rec.2020 (the working space of the colour node)
__DEVICE__ float luma2020(float3 c) { return 0.2627f * c.x + 0.6780f * c.y + 0.0593f * c.z; }

// layer coupling, x_i += k * sum_j c_ij (x_i - x_j): interimage in the
// negative, cross-talk in the print.  Neutrals (x_r = x_g = x_b) stay put.
__DEVICE__ float3 couple(float3 x, float k, float rg, float rb, float gr, float gb, float br, float bg)
{
    if (k == 0.0f) return x;
    return make_float3(x.x + k * (rg * (x.x - x.y) + rb * (x.x - x.z)),
                       x.y + k * (gr * (x.y - x.x) + gb * (x.y - x.z)),
                       x.z + k * (br * (x.z - x.x) + bg * (x.z - x.y)));
}
