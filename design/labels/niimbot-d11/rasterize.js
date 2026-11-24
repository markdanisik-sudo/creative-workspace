// Renders each label SVG to a high-resolution master: 30 × 14 mm at 80 px/mm (2032 dpi),
// 2400 × 1120 px, so curves and edges stay clean when the NIIMBOT app scales it to the printer.
// Usage: node rasterize.js <svg-dir> <png-dir>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [svgDir, pngDir] = process.argv.slice(2);
const [W, H] = [2400, 1120];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  fs.mkdirSync(pngDir, { recursive: true });
  for (const file of fs.readdirSync(svgDir).filter((f) => f.endsWith(".svg"))) {
    const svg = fs.readFileSync(path.join(svgDir, file), "utf8");
    await page.setContent(
      `<html><body style="margin:0;background:#fff">${svg.replace(/width="30mm" height="14mm"/, `width="${W}" height="${H}"`)}</body></html>`,
    );
    await page.screenshot({ path: path.join(pngDir, file.replace(".svg", ".png")) });
  }
  await browser.close();
})();
