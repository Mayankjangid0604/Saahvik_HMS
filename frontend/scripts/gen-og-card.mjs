import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const markPath = join(__dirname, "../public/brand/saahvik-mark.png");
const markB64 = readFileSync(markPath).toString("base64");
const markDataUri = `data:image/png;base64,${markB64}`;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=block" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: linear-gradient(135deg, #1b2a4a 0%, #0b1735 100%);
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
  }
  .grid-motif {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 540px;
    opacity: 1;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 45%);
    mask-image: linear-gradient(to right, transparent 0%, #000 45%);
  }
  .content {
    position: absolute;
    left: 64px;
    top: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 680px;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 32px;
  }
  .brand-mark {
    width: 56px;
    height: 56px;
  }
  .brand-name {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #f8f1dc 0%, #dbc08d 55%, #a88d5c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }
  .rule {
    width: 56px;
    height: 1.5px;
    background: #b08d57;
    margin-bottom: 28px;
  }
  .headline {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 58px;
    font-weight: 600;
    line-height: 1.1;
    color: #f8f5ef;
    margin-bottom: 20px;
    letter-spacing: 0.005em;
  }
  .headline .gold {
    background: linear-gradient(180deg, #f8f1dc 0%, #dbc08d 55%, #a88d5c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subline {
    font-size: 20px;
    color: rgba(248, 245, 239, 0.70);
    letter-spacing: 0.01em;
    line-height: 1.5;
  }
  .url {
    position: absolute;
    bottom: 44px;
    left: 64px;
    font-size: 15px;
    letter-spacing: 0.1em;
    color: rgba(248, 245, 239, 0.45);
  }
  .badge {
    position: absolute;
    top: 40px;
    right: 48px;
    background: rgba(176, 141, 87, 0.15);
    border: 1px solid rgba(207, 181, 132, 0.35);
    border-radius: 999px;
    padding: 8px 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #cfb584;
  }
</style>
</head>
<body>
  <svg class="grid-motif" viewBox="0 0 540 630" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" x="0" y="0" width="135" height="105" patternUnits="userSpaceOnUse">
        <rect width="135" height="105" fill="none" stroke="#cfb584" stroke-width="1" opacity="0.25"/>
      </pattern>
    </defs>
    <rect width="540" height="630" fill="url(#grid)"/>
    <!-- Occupied cells -->
    <rect x="135" y="0" width="135" height="105" fill="#cfb584" opacity="0.13"/>
    <rect x="405" y="105" width="135" height="105" fill="#cfb584" opacity="0.13"/>
    <rect x="270" y="315" width="135" height="105" fill="#cfb584" opacity="0.13"/>
    <rect x="0" y="420" width="135" height="105" fill="#cfb584" opacity="0.13"/>
    <rect x="405" y="420" width="135" height="105" fill="#cfb584" opacity="0.13"/>
  </svg>

  <div class="content">
    <div class="brand-row">
      <img src="${markDataUri}" class="brand-mark" alt="">
      <span class="brand-name">Saahvik</span>
    </div>
    <div class="rule"></div>
    <div class="headline">
      Every bed.<br>Every rupee.<br><span class="gold">Every resident.</span>
    </div>
    <div class="subline">Smarter hostel management — built for India.</div>
  </div>

  <div class="badge">Now Live</div>
  <div class="url">www.saahvik.com</div>
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  // Wait for Cormorant Garamond to load
  await page.waitForFunction(() => document.fonts.ready);
  const outPath = join(__dirname, "../public/brand/og-card.png");
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log("✓ OG card written to", outPath);
})();
