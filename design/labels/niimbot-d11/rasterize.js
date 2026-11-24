// Renders each label SVG to print-ready PNGs at the printer's own resolution,
// 203 dpi (D11) and 300 dpi (D11-H): 30 × 14 mm → 240 × 112 px and 354 × 165 px.
// Usage: node rasterize.js <svg-dir> <png-dir>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [svgDir, pngDir] = process.argv.slice(2);
const SIZES = { "203dpi": [240, 112], "300dpi": [354, 165] };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const file of fs.readdirSync(svgDir).filter((f) => f.endsWith(".svg"))) {
    const svg = fs.readFileSync(path.join(svgDir, file), "utf8");
    for (const [label, [w, h]] of Object.entries(SIZES)) {
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(
        `<html><body style="margin:0;background:#fff">${svg.replace(/width="30mm" height="14mm"/, `width="${w}" height="${h}"`)}</body></html>`,
      );
      fs.mkdirSync(path.join(pngDir, label), { recursive: true });
      await page.screenshot({ path: path.join(pngDir, label, file.replace(".svg", ".png")), omitBackground: false });
    }
  }
  await browser.close();
})();
