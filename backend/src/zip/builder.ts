import archiver from "archiver";
import axios from "axios";
import path from "path";
import type { Response } from "express";
import type { ScrapeResult } from "../scraper";

export async function buildZip(data: ScrapeResult, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", reject);
    archive.on("finish", resolve);
    archive.pipe(res);

    // ── Images/ ──
    // (downloaded asynchronously below)

    // ── Content/ ──
    archive.append(generateContentJson(data), { name: "Content/content.json" });
    archive.append(generateContentHtml(data), { name: "Content/content.html" });

    // ── Design System/ ──
    archive.append(generateDesignSystemJson(data), { name: "Design System/design-system.json" });
    archive.append(generateSpaHtml(data), { name: "Design System/index.html" });
    archive.append(generateCss(data), { name: "Design System/styles.css" });

    // ── Colour Palette/ ──
    archive.append(generatePaletteJson(data), { name: "Colour Palette/palette.json" });
    archive.append(generatePaletteHtml(data), { name: "Colour Palette/palette.html" });

    // ── Typography/ ──
    archive.append(generateTypographyJson(data), { name: "Typography/typography.json" });
    archive.append(generateTypographyHtml(data), { name: "Typography/typography.html" });

    // ── README ──
    archive.append(generateReadme(data), { name: "README.md" });

    addImages(data, archive)
      .then(() => archive.finalize())
      .catch(reject);
  });
}

// ─────────────────────────────────────────────
// Content/
// ─────────────────────────────────────────────
function generateContentJson(data: ScrapeResult): string {
  return JSON.stringify({
    source: data.url,
    title: data.title,
    extractedAt: new Date().toISOString(),
    headings: data.content.headings,
    paragraphs: data.content.paragraphs,
    buttons: data.content.buttons,
    links: data.content.links,
    navItems: data.content.navItems,
  }, null, 2);
}

function generateContentHtml(data: ScrapeResult): string {
  const { content, title, url } = data;

  const headingItems = content.headings.map((h, i) =>
    `<li class="item"><span class="idx">${i + 1}</span>${esc(h)}</li>`
  ).join("\n");

  const paraItems = content.paragraphs.map((p, i) =>
    `<li class="item"><span class="idx">${i + 1}</span><p>${esc(p)}</p></li>`
  ).join("\n");

  const buttonItems = content.buttons.map((b) =>
    `<span class="badge">${esc(b)}</span>`
  ).join("\n");

  const navItems = content.navItems.map((n) =>
    `<span class="badge">${esc(n)}</span>`
  ).join("\n");

  const linkItems = content.links.map((l) =>
    `<li class="item link-item"><a href="${esc(l.href)}" style="color:#a855f7">${esc(l.text)}</a></li>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Content — ${esc(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f11; color: #e4e4e7; margin: 0; padding: 2rem; line-height: 1.6; }
    .header { margin-bottom: 2.5rem; padding-bottom: 1rem; border-bottom: 1px solid #27272a; }
    .header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .header p { font-size: 0.85rem; color: #71717a; margin: 0; }
    .section { margin-bottom: 2.5rem; }
    .section h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a855f7; margin-bottom: 1rem; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .item { display: flex; gap: 1rem; align-items: flex-start; background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.9rem; }
    .idx { color: #52525b; font-size: 0.75rem; min-width: 1.5rem; padding-top: 0.1rem; }
    .item p { margin: 0; color: #a1a1aa; }
    .link-item { color: #a855f7; font-size: 0.85rem; }
    .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .badge { background: #27272a; border: 1px solid #3f3f46; border-radius: 999px; padding: 0.35rem 0.9rem; font-size: 0.8rem; color: #d4d4d8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${esc(title)}</h1>
    <p>Extracted from <a href="${esc(url)}" style="color:#a855f7">${esc(url)}</a></p>
  </div>

  <div class="section">
    <h2>Headings (${content.headings.length})</h2>
    <ul>${headingItems}</ul>
  </div>

  <div class="section">
    <h2>Paragraphs (${content.paragraphs.length})</h2>
    <ul>${paraItems}</ul>
  </div>

  <div class="section">
    <h2>Navigation Items</h2>
    <div class="badges">${navItems || '<span style="color:#52525b">None found</span>'}</div>
  </div>

  <div class="section">
    <h2>Buttons / CTAs</h2>
    <div class="badges">${buttonItems || '<span style="color:#52525b">None found</span>'}</div>
  </div>

  <div class="section">
    <h2>Links (${content.links.length})</h2>
    <ul>${linkItems}</ul>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Colour Palette/
// ─────────────────────────────────────────────
function generatePaletteJson(data: ScrapeResult): string {
  return JSON.stringify({
    source: data.url,
    extractedAt: new Date().toISOString(),
    primary: data.colors.primary,
    secondary: data.colors.secondary,
    accent: data.colors.accent,
    background: data.colors.background,
    all: data.colors.all,
  }, null, 2);
}

function generatePaletteHtml(data: ScrapeResult): string {
  const { colors, title, url } = data;

  const roles = [
    { label: "Primary", value: colors.primary },
    { label: "Secondary", value: colors.secondary },
    { label: "Accent", value: colors.accent },
    { label: "Background", value: colors.background },
  ];

  const roleSwatches = roles.map(({ label, value }) => `
    <div class="swatch-wrap">
      <div class="swatch large" style="background:${value}"></div>
      <div class="swatch-meta">
        <span class="swatch-role">${label}</span>
        <span class="swatch-hex">${value}</span>
      </div>
    </div>`).join("");

  const allSwatches = colors.all.map((c) => `
    <div class="swatch-wrap small">
      <div class="swatch" style="background:${c}"></div>
      <span class="swatch-hex">${c}</span>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Colour Palette — ${esc(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f11; color: #e4e4e7; margin: 0; padding: 2rem; }
    .header { margin-bottom: 2.5rem; padding-bottom: 1rem; border-bottom: 1px solid #27272a; }
    .header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .header p { font-size: 0.85rem; color: #71717a; margin: 0; }
    .section { margin-bottom: 2.5rem; }
    .section h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a855f7; margin-bottom: 1.25rem; }
    .role-grid { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .swatch-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
    .swatch { width: 120px; height: 80px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .swatch.large { width: 140px; height: 100px; }
    .swatch-meta { display: flex; flex-direction: column; gap: 0.15rem; }
    .swatch-role { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; }
    .swatch-hex { font-size: 0.8rem; font-family: monospace; color: #a1a1aa; }
    .all-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .swatch-wrap.small .swatch { width: 72px; height: 56px; }
    .swatch-wrap.small .swatch-hex { font-size: 0.7rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Colour Palette — ${esc(title)}</h1>
    <p>Extracted from <a href="${esc(url)}" style="color:#a855f7">${esc(url)}</a></p>
  </div>

  <div class="section">
    <h2>Brand Colours</h2>
    <div class="role-grid">${roleSwatches}</div>
  </div>

  <div class="section">
    <h2>All Extracted Colours (${colors.all.length})</h2>
    <div class="all-grid">${allSwatches}</div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Typography/
// ─────────────────────────────────────────────
function generateTypographyJson(data: ScrapeResult): string {
  return JSON.stringify({
    source: data.url,
    extractedAt: new Date().toISOString(),
    headingFont: data.typography.headingFont,
    bodyFont: data.typography.bodyFont,
    sizes: data.typography.sizes,
  }, null, 2);
}

function generateTypographyHtml(data: ScrapeResult): string {
  const { typography, title, url } = data;
  const googleFonts = buildGoogleFontsUrl(typography.headingFont, typography.bodyFont);

  const sizeRows = Object.entries(typography.sizes).map(([tag, size]) => `
    <tr>
      <td class="tag">&lt;${tag}&gt;</td>
      <td class="size">${size}</td>
      <td class="preview" style="font-size:${size};font-family:'${typography.headingFont}',sans-serif">
        The quick brown fox
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Typography — ${esc(title)}</title>
  ${googleFonts ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link href="${googleFonts}" rel="stylesheet" />` : ""}
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f11; color: #e4e4e7; margin: 0; padding: 2rem; line-height: 1.6; }
    .header { margin-bottom: 2.5rem; padding-bottom: 1rem; border-bottom: 1px solid #27272a; }
    .header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .header p { font-size: 0.85rem; color: #71717a; margin: 0; }
    .section { margin-bottom: 2.5rem; }
    .section h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a855f7; margin-bottom: 1.25rem; }
    .font-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .font-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 1.5rem; }
    .font-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 0.5rem; }
    .font-name { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
    .font-preview-h { font-size: 1.75rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
    .font-preview-b { font-size: 1rem; line-height: 1.6; color: #a1a1aa; }
    table { width: 100%; border-collapse: collapse; background: #18181b; border-radius: 12px; overflow: hidden; }
    th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; border-bottom: 1px solid #27272a; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #1c1c1e; vertical-align: middle; }
    td.tag { font-family: monospace; font-size: 0.85rem; color: #a855f7; width: 80px; }
    td.size { font-family: monospace; font-size: 0.85rem; color: #71717a; width: 80px; }
    td.preview { color: #d4d4d8; }
    @media (max-width: 600px) { .font-cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Typography — ${esc(title)}</h1>
    <p>Extracted from <a href="${esc(url)}" style="color:#a855f7">${esc(url)}</a></p>
  </div>

  <div class="section">
    <h2>Fonts</h2>
    <div class="font-cards">
      <div class="font-card">
        <div class="font-label">Heading Font</div>
        <div class="font-name" style="font-family:'${esc(typography.headingFont)}',sans-serif">${esc(typography.headingFont)}</div>
        <div class="font-preview-h" style="font-family:'${esc(typography.headingFont)}',sans-serif">Extract Any Website In Seconds</div>
      </div>
      <div class="font-card">
        <div class="font-label">Body Font</div>
        <div class="font-name" style="font-family:'${esc(typography.bodyFont)}',sans-serif">${esc(typography.bodyFont)}</div>
        <div class="font-preview-b" style="font-family:'${esc(typography.bodyFont)}',sans-serif">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Type Scale</h2>
    <table>
      <thead>
        <tr><th>Element</th><th>Size</th><th>Preview</th></tr>
      </thead>
      <tbody>${sizeRows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Design System/
// ─────────────────────────────────────────────
function generateDesignSystemJson(data: ScrapeResult): string {
  return JSON.stringify({
    source: data.url,
    title: data.title,
    extractedAt: new Date().toISOString(),
    colors: data.colors,
    typography: data.typography,
    stats: {
      headings: data.content.headings.length,
      paragraphs: data.content.paragraphs.length,
      buttons: data.content.buttons.length,
      navItems: data.content.navItems.length,
      images: data.images.length,
    },
  }, null, 2);
}

function generateSpaHtml(data: ScrapeResult): string {
  const { typography, colors, content, title, url } = data;
  const googleFonts = buildGoogleFontsUrl(typography.headingFont, typography.bodyFont);

  // Short brand name: use hostname (e.g. "kfc") rather than full page title
  const brandName = (() => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return host.split(".")[0].toUpperCase();
    } catch { return title.split("|")[0].trim() || title; }
  })();

  const navLinks = content.navItems.length
    ? content.navItems.map((t) => `<a href="#">${esc(t)}</a>`).join("\n      ")
    : "";

  const featureSections = content.paragraphs
    .slice(1, 7)
    .map((p, i) => `
    <div class="card">
      <h3>${esc(content.headings[i + 1] ?? `Section ${i + 2}`)}</h3>
      <p>${esc(p)}</p>
    </div>`).join("\n");

  const ctaButtons = content.buttons
    .slice(0, 3)
    .map((b) => `<a class="btn" href="#">${esc(b)}</a>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  ${googleFonts ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link href="${googleFonts}" rel="stylesheet" />` : ""}
  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <nav class="navbar">
    <span class="brand">${esc(brandName)}</span>
    <div class="nav-links">${navLinks}</div>
  </nav>

  <section class="hero">
    <div class="container">
      <h1>${esc(content.headings[0] ?? title)}</h1>
      <p class="hero-sub">${esc(content.paragraphs[0] ?? "")}</p>
      <div class="cta-group">
        ${ctaButtons || `<a class="btn" href="${esc(url)}">Visit Original</a>`}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <h2>Colour Palette</h2>
      <div class="palette">
        ${colors.all.slice(0, 12).map((c) =>
          `<div class="swatch" style="background:${c}" title="${c}"><span class="swatch-label">${c}</span></div>`
        ).join("\n        ")}
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <h2>Typography</h2>
      <div class="type-demo">
        <div class="type-card">
          <span class="type-tag">Heading Font</span>
          <p class="type-sample-heading">${esc(typography.headingFont)}</p>
          <p class="type-preview-heading">The quick brown fox</p>
        </div>
        <div class="type-card">
          <span class="type-tag">Body Font</span>
          <p class="type-sample-body">${esc(typography.bodyFont)}</p>
          <p class="type-preview-body">The quick brown fox jumps over the lazy dog.</p>
        </div>
      </div>
    </div>
  </section>

  ${featureSections ? `<section class="section">
    <div class="container">
      <h2>${esc(content.headings[1] ?? "Sections")}</h2>
      <div class="grid">${featureSections}</div>
    </div>
  </section>` : ""}

  <footer class="footer">
    <p>Extracted from <a href="${esc(url)}" target="_blank">${esc(url)}</a></p>
    <p class="footer-sub">Generated by Asset Extractor</p>
  </footer>

</body>
</html>`;
}

function generateCss(data: ScrapeResult): string {
  const { colors, typography } = data;
  const sizes = Object.entries(typography.sizes)
    .map(([tag, size]) => `  ${tag} { font-size: ${size}; }`)
    .join("\n");

  return `/* Design System — generated by Asset Extractor */

:root {
  --color-primary:    ${colors.primary};
  --color-secondary:  ${colors.secondary};
  --color-accent:     ${colors.accent};
  --color-background: ${colors.background};
  --font-heading:     '${typography.headingFont}', sans-serif;
  --font-body:        '${typography.bodyFont}', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body);
  background-color: var(--color-background);
  color: var(--color-primary);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); line-height: 1.2; }

${sizes}

.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }

.navbar { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: var(--color-background); border-bottom: 1px solid ${colors.primary}18; position: sticky; top: 0; z-index: 100; }
.brand { font-family: var(--font-heading); font-weight: 700; font-size: 1.25rem; }
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: var(--color-primary); text-decoration: none; font-size: 0.9rem; opacity: 0.7; transition: opacity 0.2s; }
.nav-links a:hover { opacity: 1; }

.hero { padding: 6rem 2rem; text-align: center; }
.hero h1 { font-size: clamp(2rem, 5vw, 4rem); margin-bottom: 1.5rem; }
.hero-sub { font-size: 1.125rem; opacity: 0.7; max-width: 600px; margin: 0 auto 2rem; }
.cta-group { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

.btn { display: inline-block; padding: 0.75rem 2rem; border-radius: 999px; background: var(--color-accent); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: opacity 0.2s, transform 0.2s; }
.btn:hover { opacity: 0.85; transform: translateY(-1px); }

.section { padding: 5rem 0; }
.section-alt { background: ${colors.primary}08; }
.section h2 { font-size: 2rem; margin-bottom: 2.5rem; }

.palette { display: flex; flex-wrap: wrap; gap: 1rem; }
.swatch { width: 80px; height: 80px; border-radius: 12px; border: 1px solid ${colors.primary}18; position: relative; cursor: pointer; }
.swatch-label { position: absolute; bottom: -1.5rem; left: 50%; transform: translateX(-50%); font-size: 0.65rem; white-space: nowrap; opacity: 0.6; font-family: monospace; }

.type-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.type-card { padding: 2rem; background: ${colors.primary}06; border-radius: 16px; border: 1px solid ${colors.primary}12; }
.type-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; }
.type-sample-heading { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.type-sample-body { font-family: var(--font-body); font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.type-preview-heading { font-family: var(--font-heading); font-size: 1.1rem; opacity: 0.6; }
.type-preview-body { font-family: var(--font-body); font-size: 1rem; opacity: 0.6; line-height: 1.6; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.card { padding: 2rem; background: ${colors.primary}06; border-radius: 16px; border: 1px solid ${colors.primary}12; }
.card h3 { margin-bottom: 0.75rem; font-size: 1.125rem; }
.card p { font-size: 0.95rem; opacity: 0.7; line-height: 1.7; }

.footer { padding: 3rem 2rem; text-align: center; border-top: 1px solid ${colors.primary}18; opacity: 0.5; font-size: 0.875rem; }
.footer a { color: var(--color-accent); text-decoration: none; }
.footer-sub { margin-top: 0.5rem; font-size: 0.75rem; }

@media (max-width: 768px) {
  .type-demo { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .hero { padding: 4rem 1.5rem; }
}`;
}

// ─────────────────────────────────────────────
// Images/ — browser-captured bitmaps + server-side meta/OG downloads
// ─────────────────────────────────────────────
async function addImages(data: ScrapeResult, archive: archiver.Archiver): Promise<void> {
  let count = 0;

  // 1. Browser-captured bitmap images (PNG/JPEG/WebP/GIF/AVIF — not SVG)
  //    These bypass CDN hotlink protection since the browser fetched them with cookies.
  const bitmaps = data.capturedImages.filter((img) => /\.(png|jpe?g|gif|webp|avif|ico)$/i.test(img.filename));
  const svgs    = data.capturedImages.filter((img) => /\.svg$/i.test(img.filename));

  for (const img of bitmaps) {
    archive.append(img.buffer, { name: `Images/${img.filename}` });
    count++;
  }

  // 2. Server-side download for meta/OG images (og:image, twitter:image, apple-touch-icon)
  //    These sit at the top of data.images and are almost always accessible JPEG/PNG files.
  //    Always attempt these regardless of what the browser captured.
  const metaUrls = data.images.slice(0, 8);
  await Promise.allSettled(
    metaUrls.map(async (url) => {
      if (count >= 20) return;
      try {
        const res = await axios.get<ArrayBuffer>(url, {
          responseType: "arraybuffer",
          timeout: 8_000,
          maxContentLength: 5 * 1024 * 1024,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": new URL(url).origin,
          },
        });
        const ext = (path.extname(new URL(url).pathname).split("?")[0] || ".jpg").toLowerCase();
        if (!/\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(ext)) return;
        const slug = Math.random().toString(36).slice(2, 8);
        archive.append(Buffer.from(res.data), { name: `Images/${slug}${ext}` });
        count++;
      } catch { /* skip inaccessible */ }
    })
  );

  // 3. Server-side download for remaining DOM images (if still low)
  if (count < 5 && data.images.length > 8) {
    await Promise.allSettled(
      data.images.slice(8, 30).map(async (url) => {
        if (count >= 15) return;
        try {
          const res = await axios.get<ArrayBuffer>(url, {
            responseType: "arraybuffer",
            timeout: 6_000,
            maxContentLength: 5 * 1024 * 1024,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
              "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
              "Referer": new URL(url).origin,
            },
          });
          const ext = (path.extname(new URL(url).pathname).split("?")[0] || ".jpg").toLowerCase();
          if (!/\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(ext)) return;
          const slug = Math.random().toString(36).slice(2, 8);
          archive.append(Buffer.from(res.data), { name: `Images/${slug}${ext}` });
          count++;
        } catch { /* skip */ }
      })
    );
  }

  // 4. Add SVG captures as supplementary icons (logos etc.)
  for (const img of svgs.slice(0, 10)) {
    archive.append(img.buffer, { name: `Images/${img.filename}` });
    count++;
  }

  // 5. Ensure folder always has something
  if (count === 0) {
    const note = data.images.length > 0
      ? `Images could not be downloaded (CDN protection).\n\nDetected URLs:\n${data.images.slice(0, 20).join("\n")}`
      : "No images were found on this page.";
    archive.append(note, { name: "Images/image-urls.txt" });
  }
}

// ─────────────────────────────────────────────
// README
// ─────────────────────────────────────────────
function generateReadme(data: ScrapeResult): string {
  return `# ${data.title}

Extracted from: ${data.url}
Generated by: Asset Extractor
Date: ${new Date().toISOString()}

## Folder Structure

| Folder | Contents |
|--------|----------|
| Images/ | ${data.images.length} downloaded website images |
| Content/ | Extracted text — headings, paragraphs, buttons, links |
| Design System/ | Full SPA preview (index.html + styles.css) + design-system.json |
| Colour Palette/ | Visual palette (palette.html) + palette.json |
| Typography/ | Font preview (typography.html) + typography.json |

## Design Tokens

### Colours
- Primary:    ${data.colors.primary}
- Secondary:  ${data.colors.secondary}
- Accent:     ${data.colors.accent}
- Background: ${data.colors.background}

### Typography
- Heading: ${data.typography.headingFont}
- Body:    ${data.typography.bodyFont}

## Usage

Open any \`.html\` file in a browser to preview the extracted assets.
Edit \`Design System/styles.css\` to customise the design tokens.
`;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildGoogleFontsUrl(headingFont: string, bodyFont: string): string {
  const systemFonts = ["sans-serif", "serif", "monospace", "Arial", "Helvetica", "Times New Roman", "Georgia"];
  const fonts = [...new Set([headingFont, bodyFont])].filter(
    (f) => f && !systemFonts.some((s) => f.toLowerCase().includes(s.toLowerCase()))
  );
  if (!fonts.length) return "";
  const families = fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
