// main() for a DCTL built with dctl2cpp.py: reads an image from stdin, runs
// transform() on every pixel and writes the result to stdout.
//   stdin / stdout: int32 width, int32 height, then width*height*3 float32 RGB
//   argv: p_Name=value to set UI parameters, or --params to list them as JSON
int main(int argc, char** argv)
{
    for (int i = 1; i < argc; i++) {
        if (!std::strcmp(argv[i], "--params")) { std::fputs(DCTL_PARAMS_JSON, stdout); return 0; }
        const char* eq = std::strchr(argv[i], '=');
        if (!eq || !set_param(std::string(argv[i], eq - argv[i]), std::atof(eq + 1))) {
            std::fprintf(stderr, "unknown parameter: %s\n", argv[i]);
            return 2;
        }
    }
    int wh[2];
    if (std::fread(wh, sizeof(int), 2, stdin) != 2) return 1;
    const int w = wh[0], h = wh[1];
    std::vector<float> in((size_t)w * h * 3), out((size_t)w * h * 3);
    if (std::fread(in.data(), sizeof(float), in.size(), stdin) != in.size()) return 1;
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            const float* p = &in[((size_t)y * w + x) * 3];
#ifdef DCTL_TEXTURE
            float3 o = transform(w, h, x, y, Plane{in.data(), w, h, 0}, Plane{in.data(), w, h, 1}, Plane{in.data(), w, h, 2});
#else
            float3 o = transform(w, h, x, y, p[0], p[1], p[2]);
#endif
            float* q = &out[((size_t)y * w + x) * 3];
            q[0] = o.x; q[1] = o.y; q[2] = o.z;
        }
    }
    std::fwrite(wh, sizeof(int), 2, stdout);
    std::fwrite(out.data(), sizeof(float), out.size(), stdout);
    return 0;
}
