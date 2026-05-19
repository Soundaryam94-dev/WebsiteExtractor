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

    // ── JSON data files ──
    archive.append(JSON.stringify(data.content, null, 2), { name: "content.json" });
    archive.append(JSON.stringify(buildDesignSystem(data), null, 2), { name: "design-system.json" });

    // ── Generated files ──
    archive.append(generateHtml(data), { name: "index.html" });
    archive.append(generateCss(data), { name: "styles.css" });
    archive.append(generatePackageJson(data.title), { name: "package.json" });
    archive.append(generateReadme(data), { name: "README.md" });

    // ── Images ──
    downloadImages(data.images, archive)
      .then(() => archive.finalize())
      .catch(reject);
  });
}

// ─────────────────────────────────────────────
// Design system JSON
// ─────────────────────────────────────────────
function buildDesignSystem(data: ScrapeResult) {
  return {
    source: data.url,
    title: data.title,
    extractedAt: new Date().toISOString(),
    colors: data.colors,
    typography: data.typography,
    content: {
      headingsCount: data.content.headings.length,
      paragraphsCount: data.content.paragraphs.length,
      buttonsCount: data.content.buttons.length,
      navItemsCount: data.content.navItems.length,
    },
    images: {
      total: data.images.length,
      urls: data.images,
    },
  };
}

// ─────────────────────────────────────────────
// Full SPA HTML
// ─────────────────────────────────────────────
function generateHtml(data: ScrapeResult): string {
  const { typography, colors, content, title, url } = data;

  const googleFonts = buildGoogleFontsUrl(typography.headingFont, typography.bodyFont);

  const navLinks = content.navItems.length
    ? content.navItems.map((t) => `<a href="#">${esc(t)}</a>`).join("\n      ")
    : `<a href="#">Home</a><a href="#">About</a><a href="#">Contact</a>`;

  const featureSections = content.paragraphs
    .slice(1, 7)
    .map(
      (p, i) => `
    <div class="card">
      <h3>${esc(content.headings[i + 1] ?? `Section ${i + 2}`)}</h3>
      <p>${esc(p)}</p>
    </div>`
    )
    .join("\n");

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

  <!-- NAVBAR -->
  <nav class="navbar">
    <span class="brand">${esc(title)}</span>
    <div class="nav-links">
      ${navLinks}
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="container">
      <h1>${esc(content.headings[0] ?? title)}</h1>
      <p class="hero-sub">${esc(content.paragraphs[0] ?? "")}</p>
      <div class="cta-group">
        ${ctaButtons || `<a class="btn" href="${esc(url)}">Visit Original</a>`}
      </div>
    </div>
  </section>

  <!-- COLOR PALETTE -->
  <section class="section">
    <div class="container">
      <h2>Color Palette</h2>
      <div class="palette">
        ${colors.all
          .slice(0, 10)
          .map(
            (c) =>
              `<div class="swatch" style="background:${c}" title="${c}">
          <span class="swatch-label">${c}</span>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>
  </section>

  <!-- TYPOGRAPHY -->
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

  ${
    featureSections
      ? `<!-- CONTENT SECTIONS -->
  <section class="section">
    <div class="container">
      <h2>${esc(content.headings[1] ?? "Sections")}</h2>
      <div class="grid">
        ${featureSections}
      </div>
    </div>
  </section>`
      : ""
  }

  <!-- FOOTER -->
  <footer class="footer">
    <p>Extracted from <a href="${esc(url)}" target="_blank">${esc(url)}</a></p>
    <p class="footer-sub">Generated by Asset Extractor</p>
  </footer>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// CSS from design system
// ─────────────────────────────────────────────
function generateCss(data: ScrapeResult): string {
  const { colors, typography } = data;

  const sizes = Object.entries(typography.sizes)
    .map(([tag, size]) => `  ${tag} { font-size: ${size}; }`)
    .join("\n");

  return `/* ── Design System — generated by Asset Extractor ── */

:root {
  --color-primary:    ${colors.primary};
  --color-secondary:  ${colors.secondary};
  --color-accent:     ${colors.accent};
  --color-background: ${colors.background};
  --font-heading:     '${typography.headingFont}', sans-serif;
  --font-body:        '${typography.bodyFont}', sans-serif;
}

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body);
  background-color: var(--color-background);
  color: var(--color-primary);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
}

/* Type scale */
${sizes}

/* Layout */
.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }

/* Navbar */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--color-background);
  border-bottom: 1px solid ${colors.primary}18;
  position: sticky;
  top: 0;
  z-index: 100;
}
.brand { font-family: var(--font-heading); font-weight: 700; font-size: 1.25rem; }
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: var(--color-primary); text-decoration: none; font-size: 0.9rem; opacity: 0.7; transition: opacity 0.2s; }
.nav-links a:hover { opacity: 1; }

/* Hero */
.hero { padding: 6rem 2rem; text-align: center; }
.hero h1 { font-size: clamp(2rem, 5vw, 4rem); margin-bottom: 1.5rem; }
.hero-sub { font-size: 1.125rem; opacity: 0.7; max-width: 600px; margin: 0 auto 2rem; }
.cta-group { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }

/* Button */
.btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: opacity 0.2s, transform 0.2s;
}
.btn:hover { opacity: 0.85; transform: translateY(-1px); }

/* Sections */
.section { padding: 5rem 0; }
.section-alt { background: ${colors.primary}08; }
.section h2 { font-size: 2rem; margin-bottom: 2.5rem; }

/* Color Palette */
.palette { display: flex; flex-wrap: wrap; gap: 1rem; }
.swatch {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 1px solid ${colors.primary}18;
  position: relative;
  cursor: pointer;
}
.swatch-label {
  position: absolute;
  bottom: -1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  white-space: nowrap;
  opacity: 0.6;
  font-family: monospace;
}

/* Typography demo */
.type-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.type-card { padding: 2rem; background: ${colors.primary}06; border-radius: 16px; border: 1px solid ${colors.primary}12; }
.type-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; }
.type-sample-heading { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.type-sample-body { font-family: var(--font-body); font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.type-preview-heading { font-family: var(--font-heading); font-size: 1.1rem; opacity: 0.6; }
.type-preview-body { font-family: var(--font-body); font-size: 1rem; opacity: 0.6; line-height: 1.6; }

/* Grid cards */
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.card { padding: 2rem; background: ${colors.primary}06; border-radius: 16px; border: 1px solid ${colors.primary}12; }
.card h3 { margin-bottom: 0.75rem; font-size: 1.125rem; }
.card p { font-size: 0.95rem; opacity: 0.7; line-height: 1.7; }

/* Footer */
.footer { padding: 3rem 2rem; text-align: center; border-top: 1px solid ${colors.primary}18; opacity: 0.5; font-size: 0.875rem; }
.footer a { color: var(--color-accent); text-decoration: none; }
.footer-sub { margin-top: 0.5rem; font-size: 0.75rem; }

/* Responsive */
@media (max-width: 768px) {
  .type-demo { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .hero { padding: 4rem 1.5rem; }
}`;
}

// ─────────────────────────────────────────────
// Image downloader
// ─────────────────────────────────────────────
async function downloadImages(urls: string[], archive: archiver.Archiver): Promise<void> {
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const res = await axios.get<ArrayBuffer>(url, {
          responseType: "arraybuffer",
          timeout: 8_000,
          maxContentLength: 5 * 1024 * 1024,
        });
        const ext = path.extname(new URL(url).pathname).split("?")[0] || ".png";
        const slug = Math.random().toString(36).slice(2, 8);
        archive.append(Buffer.from(res.data), {
          name: `assets/images/${slug}${ext}`,
        });
      } catch {
        // skip unreachable images
      }
    })
  );
}

// ─────────────────────────────────────────────
// package.json
// ─────────────────────────────────────────────
function generatePackageJson(title: string): string {
  const name = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "extracted-site";
  return JSON.stringify(
    {
      name,
      version: "1.0.0",
      description: `Extracted from ${title} — generated by Asset Extractor`,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { next: "^14.0.0", react: "^18.0.0", "react-dom": "^18.0.0" },
    },
    null,
    2
  );
}

// ─────────────────────────────────────────────
// README
// ─────────────────────────────────────────────
function generateReadme(data: ScrapeResult): string {
  return `# ${data.title}

Extracted from: ${data.url}
Generated by: Asset Extractor
Date: ${new Date().toISOString()}

## Contents

| File | Description |
|------|-------------|
| index.html | Full single-page website using extracted design |
| styles.css | Complete CSS with design tokens as CSS variables |
| design-system.json | Colors, typography, and metadata |
| content.json | All extracted text content |
| assets/images/ | ${data.images.length} downloaded images |

## Design System

### Colors
- Primary:    ${data.colors.primary}
- Secondary:  ${data.colors.secondary}
- Accent:     ${data.colors.accent}
- Background: ${data.colors.background}

### Typography
- Heading: ${data.typography.headingFont}
- Body:    ${data.typography.bodyFont}

## Usage

Open \`index.html\` in a browser to preview the extracted site.
CSS variables are in \`styles.css\` — customize as needed.
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
