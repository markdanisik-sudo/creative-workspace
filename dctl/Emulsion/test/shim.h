// Minimal stand-in for the DCTL runtime, so a .dctl file builds as plain C++
// and runs on the CPU.  Only the functions listed here exist: a DCTL that uses
// anything else fails to build, which catches calls Resolve doesn't have.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

#define __DEVICE__ static inline
#define __CONSTANT__ static const
#define __CONSTANTREF__ const

struct float3 { float x, y, z; };
static inline float3 make_float3(float x, float y, float z) { return float3{x, y, z}; }

static inline float _fabs(float x) { return std::fabs(x); }
static inline float _powf(float x, float y) { return std::pow(x, y); }
static inline float _logf(float x) { return std::log(x); }
static inline float _log2f(float x) { return std::log2(x); }
static inline float _log10f(float x) { return std::log10(x); }
static inline float _expf(float x) { return std::exp(x); }
static inline float _exp2f(float x) { return std::exp2(x); }
static inline float _sqrtf(float x) { return std::sqrt(x); }
static inline float _fminf(float a, float b) { return std::fmin(a, b); }
static inline float _fmaxf(float a, float b) { return std::fmax(a, b); }
static inline float _floorf(float x) { return std::floor(x); }
static inline float _sinf(float x) { return std::sin(x); }
static inline float _cosf(float x) { return std::cos(x); }
static inline float _atan2f(float y, float x) { return std::atan2(y, x); }

// one channel of the source image
struct Plane { const float* d; int w, h, c; };
typedef Plane __TEXTURE__;
static inline float _tex2D(Plane t, int x, int y)
{
    if (x < 0) x = 0; if (y < 0) y = 0;
    if (x >= t.w) x = t.w - 1; if (y >= t.h) y = t.h - 1;
    return t.d[(y * t.w + x) * 3 + t.c];
}

// .cube 3D LUT (DEFINE_LUT / APPLY_LUT), trilinear
struct CubeLut {
    int n = 0; std::vector<float> v;
    float lo[3] = {0, 0, 0}, hi[3] = {1, 1, 1};
    explicit CubeLut(const char* path)
    {
        FILE* f = std::fopen(path, "r");
        if (!f) { std::fprintf(stderr, "LUT not found: %s\n", path); std::exit(3); }
        char line[512];
        while (std::fgets(line, sizeof line, f)) {
            float a, b, c;
            if (!std::strncmp(line, "LUT_3D_SIZE", 11)) n = std::atoi(line + 11);
            else if (!std::strncmp(line, "DOMAIN_MIN", 10)) std::sscanf(line + 10, "%f %f %f", lo, lo + 1, lo + 2);
            else if (!std::strncmp(line, "DOMAIN_MAX", 10)) std::sscanf(line + 10, "%f %f %f", hi, hi + 1, hi + 2);
            else if (std::sscanf(line, "%f %f %f", &a, &b, &c) == 3) { v.push_back(a); v.push_back(b); v.push_back(c); }
        }
        std::fclose(f);
        if (n < 2 || (int)v.size() != n * n * n * 3) { std::fprintf(stderr, "bad LUT: %s\n", path); std::exit(3); }
    }
    float3 at(int r, int g, int b) const
    {
        const float* p = &v[((b * n + g) * n + r) * 3];
        return make_float3(p[0], p[1], p[2]);
    }
    float3 apply(float r, float g, float b) const
    {
        float in[3] = {r, g, b}; int i0[3]; float t[3];
        for (int k = 0; k < 3; k++) {
            float u = (in[k] - lo[k]) / (hi[k] - lo[k]) * (n - 1);
            u = std::fmin(std::fmax(u, 0.0f), (float)(n - 1));
            i0[k] = std::min((int)u, n - 2); t[k] = u - i0[k];
        }
        float3 o = make_float3(0, 0, 0);
        for (int c = 0; c < 8; c++) {
            int dr = c & 1, dg = (c >> 1) & 1, db = (c >> 2) & 1;
            float w = (dr ? t[0] : 1 - t[0]) * (dg ? t[1] : 1 - t[1]) * (db ? t[2] : 1 - t[2]);
            float3 s = at(i0[0] + dr, i0[1] + dg, i0[2] + db);
            o.x += w * s.x; o.y += w * s.y; o.z += w * s.z;
        }
        return o;
    }
};
#define APPLY_LUT(r, g, b, lut) ((lut).apply((r), (g), (b)))
