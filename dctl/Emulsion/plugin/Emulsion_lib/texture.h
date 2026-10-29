// =============================================================================
//  Emulsion: halation (on scene light, before the curve, as in the camera
//  negative) and grain (on the finished picture)
//
//  Needs input.h (camera_to_scene).
// =============================================================================

#define GOLDEN 2.39996322973f   // golden angle: even spiral sampling

// ---- hashing / noise

__DEVICE__ unsigned int hash_u(unsigned int x)
{
    x ^= x >> 16; x *= 0x7feb352dU;
    x ^= x >> 15; x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

__DEVICE__ unsigned int hash3u(int x, int y, unsigned int s)
{
    return hash_u((unsigned int)x + hash_u((unsigned int)y + hash_u(s)));
}

// uniform in [-1, 1]
__DEVICE__ float hash_sf(int x, int y, unsigned int s)
{
    return (float)(hash3u(x, y, s) & 0x00FFFFFFU) * (2.0f / 16777215.0f) - 1.0f;
}

// roughly gaussian (sum of three uniforms)
__DEVICE__ float hash_gauss(int x, int y, unsigned int s)
{
    return hash_sf(x, y, s) + hash_sf(x, y, s + 0x9e3779b9U) + hash_sf(x, y, s + 0x3c6ef372U);
}

// smooth value noise on a lattice of `size` pixels
__DEVICE__ float value_noise(float px, float py, float size, unsigned int s)
{
    float fx = px / size, fy = py / size;
    float ix = _floorf(fx), iy = _floorf(fy);
    float tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3.0f - 2.0f * tx);
    ty = ty * ty * (3.0f - 2.0f * ty);
    int x0 = (int)ix, y0 = (int)iy;
    float a = hash_gauss(x0, y0, s), b = hash_gauss(x0 + 1, y0, s);
    float c = hash_gauss(x0, y0 + 1, s), d = hash_gauss(x0 + 1, y0 + 1, s);
    float top = a + (b - a) * tx;
    return top + ((c + (d - c) * tx) - top) * ty;
}

// grain: two octaves of dye-cloud noise plus a fine silver component
__DEVICE__ float grain_noise(float px, float py, float size, unsigned int s)
{
    float n = 0.75f * value_noise(px, py, size, s)
            + 0.45f * value_noise(px + 17.3f, py - 9.1f, size * 0.55f, s ^ 0x51ed270bU)
            + 0.30f * hash_gauss((int)px, (int)py, s ^ 0xa3c59ac3U);
    return n * 0.85f;
}

// new grain whenever the picture changes (DCTL has no frame number):
// hash a sparse grid of source pixels
__DEVICE__ unsigned int frame_seed(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, int w, int h)
{
    unsigned int seed = 0x1234567U;
    for (int j = 0; j < 4; j++) {
        for (int i = 0; i < 4; i++) {
            int sx = (int)(((float)i + 0.5f) * (float)w * 0.25f);
            int sy = (int)(((float)j + 0.5f) * (float)h * 0.25f);
            float v = _tex2D(tR, sx, sy) + _tex2D(tG, sx, sy) * 1.37f + _tex2D(tB, sx, sy) * 1.91f;
            seed = hash_u(seed ^ (unsigned int)(clampf(v, 0.0f, 16.0f) * 262143.0f));
        }
    }
    return seed;
}

// how visible negative grain is after printing, by output code value:
// strongest in the upper midtones, fading into deep blacks and clean whites
__DEVICE__ float grain_weight(float v)
{
    v = clampf(v, 0.0f, 1.0f);
    return _powf(v, 1.2f) * _powf(1.0f - v, 0.8f) * (1.0f / 0.26f) + 0.04f;
}

// frame width in mm: 65 mm, 35 mm, Super 16, Super 8 (combo order of the plugin)
__DEVICE__ float frame_mm(int f)
{
    if (f == 0) return 52.48f;
    if (f == 2) return 12.52f;
    if (f == 3) return 5.79f;
    return 24.89f;
}

// Vision3-like grain on display code values.  `amount` 1 = strong; `chroma`
// 0 = the same grain in every layer (monochrome), 1 = independent layers.
__DEVICE__ float3 add_grain(float3 c, float amount, float chroma, float mm, int x, int y, float width, unsigned int seed)
{
    float size = _fmaxf(0.0114f * width / mm, 0.6f);                 // dye clouds ~11 um of film -> pixels
    float px = (float)x, py = (float)y;
    unsigned int s = hash_u(seed ^ 0x27d4eb2fU);
    float nm = grain_noise(px, py, size, s);
    float norm = 1.0f / _sqrtf((1.0f - chroma) * (1.0f - chroma) + chroma * chroma);
    float nr = (nm * (1.0f - chroma) + grain_noise(px, py, size, s ^ 0x165667b1U) * chroma) * norm;
    float ng = (nm * (1.0f - chroma) + grain_noise(px, py, size * 0.9f, s ^ 0xd3a2646cU) * chroma) * norm;
    float nb = (nm * (1.0f - chroma) + grain_noise(px, py, size * 1.15f, s ^ 0xfd7046c5U) * chroma) * norm;
    float amp = 0.03f * amount * _sqrtf(24.89f / mm);                 // smaller frame = enlarged more = grainier
    return make_float3(c.x + nr * amp * grain_weight(c.x),
                       c.y + ng * amp * 0.90f * grain_weight(c.y),
                       c.z + nb * amp * 1.35f * grain_weight(c.z));
}

// source pixel (camera code values), bilinear, clamped to the frame
__DEVICE__ float3 fetch_bilinear(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, float x, float y, int w, int h)
{
    x = clampf(x, 0.0f, (float)(w - 1)); y = clampf(y, 0.0f, (float)(h - 1));
    int x0 = (int)_floorf(x), y0 = (int)_floorf(y);
    int x1 = clampi(x0 + 1, 0, w - 1), y1 = clampi(y0 + 1, 0, h - 1);
    float tx = x - (float)x0, ty = y - (float)y0;
    float3 a = make_float3(_tex2D(tR, x0, y0), _tex2D(tG, x0, y0), _tex2D(tB, x0, y0));
    float3 b = make_float3(_tex2D(tR, x1, y0), _tex2D(tG, x1, y0), _tex2D(tB, x1, y0));
    float3 c = make_float3(_tex2D(tR, x0, y1), _tex2D(tG, x0, y1), _tex2D(tB, x0, y1));
    float3 d = make_float3(_tex2D(tR, x1, y1), _tex2D(tG, x1, y1), _tex2D(tB, x1, y1));
    return mix3(mix3(a, b, tx), mix3(c, d, tx), ty);
}

// gate weave: the frame shifts a little, differently every frame
// (`amount` in frame widths: 0.0004 subtle, 0.0012 strong)
__DEVICE__ float2 gate_weave(unsigned int seed, float amount, float width)
{
    float dx = (float)(hash_u(seed ^ 0x68e31da4U) & 0xFFFFU) / 32767.5f - 1.0f;
    float dy = (float)(hash_u(seed ^ 0xb5297a4dU) & 0xFFFFU) / 32767.5f - 1.0f;
    return make_float2(dx * amount * width * 0.6f, dy * amount * width);
}

// halation: bright scene light bleeds back from the film base into the red
// (and a little green) layer.  Exponential profile of `mm` of film around
// the pixel; returns the light to add (Rec.2020 scene linear).
__DEVICE__ float3 halation(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, float cx, float cy, int w, int h,
                           int gamut, int gamma, float gain, float mm, float warmth)
{
    const int n = 32;
    float sigma = _fmaxf(0.09f * (float)w / mm, 0.5f);                // ~0.09 mm spread in the emulsion
    float rot = (float)(hash3u((int)cx, (int)cy, 0x5bd1e995U) & 0xFFFFU) * (6.2831853f / 65535.0f);
    float acc = 0.0f, wsum = 0.0f;
    for (int i = 0; i < n; i++) {
        float r = _sqrtf(((float)i + 0.5f) / (float)n) * 4.0f;
        float a = (float)i * GOLDEN + rot;
        int sx = clampi((int)(cx + _cosf(a) * r * sigma + 0.5f), 0, w - 1);
        int sy = clampi((int)(cy + _sinf(a) * r * sigma + 0.5f), 0, h - 1);
        float3 e = scale3(camera_to_scene(make_float3(_tex2D(tR, sx, sy), _tex2D(tG, sx, sy), _tex2D(tB, sx, sy)), gamut, gamma), gain);
        float wt = _expf(-r);
        acc += _fmaxf(0.75f * e.x + 0.25f * e.y - 1.4f, 0.0f) * wt;   // above ~3 stops over grey
        wsum += wt;
    }
    float hv = 0.1f * acc / wsum;
    return make_float3(hv, hv * 0.22f * warmth, hv * 0.02f);
}
