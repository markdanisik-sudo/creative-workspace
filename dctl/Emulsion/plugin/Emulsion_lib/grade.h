// =============================================================================
//  Emulsion: white balance and saturation on scene light (Rec.2020 linear)
// =============================================================================

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

// the scene was lit by a T kelvin source; adapt it to 6500 K, as a camera
// does (CAT02).  Higher T = warmer picture.
__DEVICE__ float3 white_balance(float3 c, float T)
{
    if (T == 6500.0f) return c;
    float3 ls = uv_to_lms(planck_uv(T));
    float3 lr = uv_to_lms(planck_uv(6500.0f));
    float3 lms = mul3(c, 0.57961887f, 0.39268423f, -0.02307198f, -0.00223007f, 1.04932052f, -0.01168798f, 0.00548360f, 0.03726131f, 1.04468585f);
    lms = make_float3(lms.x * lr.x / ls.x, lms.y * lr.y / ls.y, lms.z * lr.z / ls.z);
    return mul3(lms, 1.72249578f, -0.64569902f, 0.03081737f, 0.00355862f, 0.95128521f, 0.01072160f, -0.00916837f, -0.03054065f, 0.95668139f);
}

// Temperature slider (-1 .. 1) -> kelvin: +-60 mired around 6500 K
__DEVICE__ float temperature_k(float t)
{
    return 1.0e6f / (1.0e6f / 6500.0f - 60.0f * t);
}

// saturation around luminance (brightness unchanged)
__DEVICE__ float3 saturate(float3 c, float s)
{
    float Y = luma2020(c);
    return make_float3(Y + (c.x - Y) * s, Y + (c.y - Y) * s, Y + (c.z - Y) * s);
}
