// =============================================================================
//  Emulsion: film texture on the displayed picture
//
//  MTF (emulsion softness, softer red layer, acutance) -> bloom -> halation
//  -> vignette -> film breath -> grain.  Sizes are in millimetres of film,
//  so the look holds at any resolution and changes with the film format.
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

// uniform in [-1, 1] from a frame seed
__DEVICE__ float seed_sf(unsigned int seed, unsigned int k)
{
    return (float)(hash_u(seed ^ k) & 0xFFFFU) / 32767.5f - 1.0f;
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

// ---- display code values <-> light

__DEVICE__ float3 to_light(float3 c, float g) { return make_float3(_powf(_fmaxf(c.x, 0.0f), g), _powf(_fmaxf(c.y, 0.0f), g), _powf(_fmaxf(c.z, 0.0f), g)); }
__DEVICE__ float3 to_code(float3 c, float g) { return to_light(c, 1.0f / g); }
__DEVICE__ float luma709(float3 c) { return 0.2126f * c.x + 0.7152f * c.y + 0.0722f * c.z; }

// ---- sampling

__DEVICE__ float3 fetch(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, int x, int y, int w, int h)
{
    x = clampi(x, 0, w - 1);
    y = clampi(y, 0, h - 1);
    return make_float3(_tex2D(tR, x, y), _tex2D(tG, x, y), _tex2D(tB, x, y));
}

__DEVICE__ float3 fetch_bilinear(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, float x, float y, int w, int h)
{
    float fx = _floorf(x), fy = _floorf(y);
    float tx = x - fx, ty = y - fy;
    int x0 = (int)fx, y0 = (int)fy;
    float3 top = mix3(fetch(tR, tG, tB, x0, y0, w, h), fetch(tR, tG, tB, x0 + 1, y0, w, h), tx);
    float3 bot = mix3(fetch(tR, tG, tB, x0, y0 + 1, w, h), fetch(tR, tG, tB, x0 + 1, y0 + 1, w, h), tx);
    return mix3(top, bot, ty);
}

// ---- per-frame seed: a sparse grid of source pixels, so grain, breath and
// weave change whenever the picture changes (DCTL has no frame number)

__DEVICE__ unsigned int frame_seed(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, int w, int h, int user, int animate)
{
    unsigned int seed = hash_u(0x1234567U + (unsigned int)user * 0x9e3779b9U);
    if (!animate) return seed;
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

// ---- MTF: emulsion softness (gaussian), a softer red layer (deepest in the
// emulsion), and the development adjacency effect (acutance)

__DEVICE__ float3 film_mtf(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, int cx, int cy, int w, int h,
                           float3 c, float sm, float sr, float sa, float acut)
{
    if (sr > 0.3f) {
        int R = clampi((int)(3.0f * sr + 0.999f), 1, 4);
        float3 acc = f3(0.0f);
        float accR = 0.0f, ws = 0.0f, wr = 0.0f;
        float im = sm > 0.3f ? 0.5f / (sm * sm) : 1e4f;
        float ir = 0.5f / (sr * sr);
        for (int dy = -R; dy <= R; dy++) {
            for (int dx = -R; dx <= R; dx++) {
                float d2 = (float)(dx * dx + dy * dy);
                float3 s = fetch(tR, tG, tB, cx + dx, cy + dy, w, h);
                float a = _expf(-d2 * im), b = _expf(-d2 * ir);
                acc = add3(acc, scale3(s, a)); ws += a;
                accR += s.x * b; wr += b;
            }
        }
        c = scale3(acc, 1.0f / ws);
        c.x = accR / wr;
    }

    // acutance: unsharp mask on luma (code values ~ density), wide and sparse
    if (acut > 0.0f && sa > 0.3f) {
        float acc = 0.0f, ws = 0.0f;
        for (int i = 0; i < 24; i++) {
            float r = _sqrtf(((float)i + 0.5f) / 24.0f) * 2.5f;
            float a = (float)i * GOLDEN;
            int sx = (int)((float)cx + _cosf(a) * r * sa + 0.5f);
            int sy = (int)((float)cy + _sinf(a) * r * sa + 0.5f);
            float wt = _expf(-0.5f * r * r);
            acc += luma709(fetch(tR, tG, tB, sx, sy, w, h)) * wt;
            ws += wt;
        }
        float d = acut * (luma709(c) - acc / ws);
        d = d / (1.0f + _fabs(d) * 4.0f);           // no hard halos on strong edges
        c = add3(c, f3(d));
    }
    return c;
}

// ---- light effects (display light)

// soft threshold: 0 below thr, then the light above it
__DEVICE__ float knee(float v, float thr)
{
    float k = 0.5f * _fmaxf(thr, 1e-3f);
    if (v <= thr - k) return 0.0f;
    if (v < thr + k) return (v - thr + k) * (v - thr + k) / (4.0f * k);
    return v - thr;
}

// bloom / diffusion: the light above the threshold, spread with a gaussian
__DEVICE__ float3 bloom_blur(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, float cx, float cy, int w, int h,
                             float sigma, float thr, int n, float rot, float rj, float dg)
{
    float3 acc = f3(0.0f);
    float wsum = 0.0f;
    for (int i = 0; i < n; i++) {
        float r = _sqrtf(((float)i + rj) / (float)n) * 2.6f;
        float a = (float)i * GOLDEN + rot;
        float3 c = to_light(fetch(tR, tG, tB, (int)(cx + _cosf(a) * r * sigma + 0.5f), (int)(cy + _sinf(a) * r * sigma + 0.5f), w, h), dg);
        float y = luma709(c);
        float wt = _expf(-0.5f * r * r);
        acc = add3(acc, scale3(c, knee(y, thr) / _fmaxf(y, 1e-6f) * wt));
        wsum += wt;
    }
    return scale3(acc, 1.0f / wsum);
}

// halation: light reflected from the film base back into the red (and some
// green) layer; exponential profile, driven by the red-band light
__DEVICE__ float halation_blur(__TEXTURE__ tR, __TEXTURE__ tG, __TEXTURE__ tB, float cx, float cy, int w, int h,
                               float sigma, float thr, int n, float rot, float rj, float dg)
{
    float acc = 0.0f, wsum = 0.0f;
    for (int i = 0; i < n; i++) {
        float r = _sqrtf(((float)i + rj) / (float)n) * 4.0f;
        float a = (float)i * GOLDEN + rot;
        float3 c = to_light(fetch(tR, tG, tB, (int)(cx + _cosf(a) * r * sigma + 0.5f), (int)(cy + _sinf(a) * r * sigma + 0.5f), w, h), dg);
        float wt = _expf(-r);
        acc += knee(0.75f * c.x + 0.25f * c.y, thr) * wt;
        wsum += wt;
    }
    return acc / wsum;
}

// lens falloff, in stops at the corners
__DEVICE__ float vignette(float x, float y, float W, float H, float amount)
{
    float dx = (x - 0.5f * W) / (0.5f * W);
    float dy = (y - 0.5f * H) / (0.5f * W);
    float r2 = (dx * dx + dy * dy) / (1.0f + (H * H) / (W * W));
    return _exp2f(-amount * r2 * r2 * 0.6f - amount * r2 * 0.4f);
}

// how visible negative grain is after printing, by output code value:
// strongest in the upper midtones, fading into deep blacks and clean whites
__DEVICE__ float grain_weight(float v)
{
    v = clampf(v, 0.0f, 1.0f);
    return _powf(v, 1.2f) * _powf(1.0f - v, 0.8f) * (1.0f / 0.26f) + 0.04f;
}
