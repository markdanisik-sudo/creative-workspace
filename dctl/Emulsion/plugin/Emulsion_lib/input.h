// =============================================================================
//  Emulsion: camera input -> scene linear light, Rec.2020 primaries
//
//  Needs the combo box values G_* (Input Color Space) and T_* (Input Gamma)
//  from the plugin's DEFINE_UI_PARAMS.
// =============================================================================

// ---- transfer functions (code value -> scene linear, 0.18 = mid grey)

__DEVICE__ float di_to_lin(float x)
{
    if (x <= 0.02740668f) return x / 10.44426855f;
    return _exp2f(x / 0.07329248f - 7.0f) - 0.0075f;
}

__DEVICE__ float lin_to_di(float x)
{
    if (x <= 0.00262409f) return x * 10.44426855f;
    return (_log2f(x + 0.0075f) + 7.0f) * 0.07329248f;
}

__DEVICE__ float logc3_to_lin(float x)      // ARRI LogC3, EI 800
{
    if (x > 0.149658f) return (exp10_f((x - 0.385537f) / 0.247190f) - 0.052272f) / 5.555556f;
    return (x - 0.092809f) / 5.367655f;
}

__DEVICE__ float logc4_to_lin(float x)
{
    const float a = 2231.82630906f;      // (2^18 - 16) / 117.45
    const float b = 0.90713587f;         // (1023 - 95) / 1023
    const float c = 0.09286413f;         // 95 / 1023
    const float s = 0.11384993f;
    const float t = -0.01805699f;
    if (x >= 0.0f) return (_exp2f(14.0f * (x - c) / b + 6.0f) - 64.0f) / a;
    return x * s + t;
}

__DEVICE__ float slog3_to_lin(float x)
{
    if (x >= 171.2102946929f / 1023.0f) return exp10_f((x * 1023.0f - 420.0f) / 261.5f) * 0.19f - 0.01f;
    return (x * 1023.0f - 95.0f) * 0.01125f / (171.2102946929f - 95.0f);
}

__DEVICE__ float vlog_to_lin(float x)
{
    if (x < 0.181f) return (x - 0.125f) / 5.6f;
    return exp10_f((x - 0.598206f) / 0.241514f) - 0.00873f;
}

__DEVICE__ float log3g10_to_lin(float x)
{
    if (x < 0.0f) return x / 15.1927f - 0.01f;
    return (exp10_f(x / 0.224282f) - 1.0f) / 155.975327f - 0.01f;
}

// Canon Log 2 / 3 (full-range code values, as Resolve passes them)
__DEVICE__ float clog2_to_lin(float x)
{
    float ire = (x * 1023.0f - 64.0f) / 876.0f;
    float v;
    if (ire < 0.092864125f) v = -(exp10_f((0.092864125f - ire) / 0.24136077f) - 1.0f) / 87.09937546f;
    else v = (exp10_f((ire - 0.092864125f) / 0.24136077f) - 1.0f) / 87.09937546f;
    return v * 0.9f;
}

__DEVICE__ float clog3_to_lin(float x)
{
    float ire = (x * 1023.0f - 64.0f) / 876.0f;
    float v;
    if (ire < 0.097465473f) v = -(exp10_f((0.12783901f - ire) / 0.36726845f) - 1.0f) / 14.98325f;
    else if (ire <= 0.15277891f) v = (ire - 0.12512219f) / 1.9754798f;
    else v = (exp10_f((ire - 0.12240537f) / 0.36726845f) - 1.0f) / 14.98325f;
    return v * 0.9f;
}

__DEVICE__ float decode_gamma(float x, int t)
{
    if (t == T_DI) return di_to_lin(x);
    if (t == T_LOGC3) return logc3_to_lin(x);
    if (t == T_LOGC4) return logc4_to_lin(x);
    if (t == T_SLOG3) return slog3_to_lin(x);
    if (t == T_VLOG) return vlog_to_lin(x);
    if (t == T_LOG3G10) return log3g10_to_lin(x);
    if (t == T_CLOG2) return clog2_to_lin(x);
    if (t == T_CLOG3) return clog3_to_lin(x);
    if (t == T_G24) return _powf(_fmaxf(x, 0.0f), 2.4f);
    if (t == T_CINEON) return GREY * exp10_f((x * 1023.0f - 446.0f) * 0.002f / 0.6f);   // ideal negative, grey on 446
    return x;                                                                         // linear
}

// ---- gamuts -> Rec.2020 (D65; camera whites adapted with CAT02)

__DEVICE__ float3 gamut_to_2020(float3 c, int g)
{
    if (g == G_DWG)  return mul3(c, 1.13030218f, -0.02039285f, -0.10990933f, -0.02554706f, 1.31084932f, -0.28530226f, -0.09259861f, -0.16465302f, 1.25725163f);
    if (g == G_AWG3) return mul3(c, 0.99068812f, 0.09253966f, -0.08322777f, 0.04663223f, 1.18752685f, -0.23415909f, 0.00140359f, -0.09460200f, 1.09319842f);
    if (g == G_AWG4) return mul3(c, 1.11946906f, -0.05519563f, -0.06427343f, -0.05848446f, 1.17673493f, -0.11825048f, 0.00154745f, -0.03113533f, 1.02958788f);
    if (g == G_SG3C) return mul3(c, 0.96004634f, 0.11953298f, -0.07957932f, -0.05223948f, 1.26430575f, -0.21206627f, -0.02884051f, -0.05952097f, 1.08836147f);
    if (g == G_VG)   return mul3(c, 1.07635314f, -0.01314478f, -0.06320837f, -0.03186184f, 1.15105266f, -0.11919082f, -0.00793202f, -0.03480314f, 1.04273516f);
    if (g == G_RWG)  return mul3(c, 1.18043085f, -0.09403956f, -0.08639129f, -0.02801732f, 1.31144204f, -0.28342472f, -0.07435952f, -0.36207760f, 1.43643712f);
    if (g == G_CCG)  return mul3(c, 1.13873610f, -0.02676853f, -0.11196757f, -0.05520759f, 1.31557329f, -0.26036570f, -0.00765941f, -0.25769762f, 1.26535703f);
    if (g == G_709)  return mul3(c, 0.62740390f, 0.32928304f, 0.04331307f, 0.06909729f, 0.91954040f, 0.01136232f, 0.01639144f, 0.08801331f, 0.89559525f);
    return c;                                                                         // Rec.2020
}

__DEVICE__ float3 camera_to_scene(float3 code, int gamut, int gamma)
{
    float3 lin = make_float3(decode_gamma(code.x, gamma), decode_gamma(code.y, gamma), decode_gamma(code.z, gamma));
    return gamut_to_2020(lin, gamut);
}

// scene linear Rec.2020 -> DaVinci Wide Gamut / DaVinci Intermediate
__DEVICE__ float3 scene_to_dwg_di(float3 c)
{
    c = mul3(c, 0.89211212f, 0.02436918f, 0.08351870f, 0.03261660f, 0.78613752f, 0.18124588f, 0.06997705f, 0.10474949f, 0.82527346f);
    return make_float3(lin_to_di(c.x), lin_to_di(c.y), lin_to_di(c.z));
}
