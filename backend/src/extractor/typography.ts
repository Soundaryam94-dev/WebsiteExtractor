import { Page } from "playwright";
import type { Typography } from "../scraper";

// CSS system font keywords that are fallbacks, not real brand fonts
const SYSTEM_FONTS = new Set([
  "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
  "ui-serif", "ui-monospace", "ui-rounded", "sans-serif", "serif",
  "monospace", "cursive", "fantasy", "segoe ui", "helvetica neue",
  "helvetica", "arial", "noto sans", "liberation sans", "freesans",
]);

function isSystemFont(name: string): boolean {
  return SYSTEM_FONTS.has(name.toLowerCase());
}

export async function extractTypography(page: Page, html: string): Promise<Typography> {
  // ── Layer 1: Browser computed styles ──
  const browser = await page.evaluate(() => {
    const sizes: Record<string, string> = {};
    for (const tag of ["h1", "h2", "h3", "h4", "p", "small"]) {
      const el = document.querySelector(tag);
      if (el) {
        const size = getComputedStyle(el).fontSize;
        if (size && size !== "0px") sizes[tag] = size;
      }
    }

    // Try multiple heading selectors, take first non-system font from the full font stack
    let headingFont = "";
    for (const sel of ["h1", "h2", "h3", "h4", "header", "nav"]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const families = getComputedStyle(el).fontFamily
        .split(",")
        .map((f) => f.replace(/['"]/g, "").trim());
      for (const f of families) {
        const lower = f.toLowerCase();
        const systemFonts = [
          "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
          "ui-serif", "ui-monospace", "sans-serif", "serif", "monospace",
          "segoe ui", "helvetica neue", "helvetica", "arial", "noto sans",
        ];
        if (f && !systemFonts.includes(lower)) { headingFont = f; break; }
      }
      if (headingFont) break;
    }

    let bodyFont = "";
    for (const sel of ["p", "body", "main", "article"]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const families = getComputedStyle(el).fontFamily
        .split(",")
        .map((f) => f.replace(/['"]/g, "").trim());
      for (const f of families) {
        const lower = f.toLowerCase();
        const systemFonts = [
          "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
          "ui-serif", "ui-monospace", "sans-serif", "serif", "monospace",
          "segoe ui", "helvetica neue", "helvetica", "arial", "noto sans",
        ];
        if (f && !systemFonts.includes(lower)) { bodyFont = f; break; }
      }
      if (bodyFont) break;
    }

    return { headingFont, bodyFont, sizes };
  }).catch(() => ({ headingFont: "", bodyFont: "", sizes: {} })) as { headingFont: string; bodyFont: string; sizes: Record<string, string> };

  // ── Layer 2: Parse raw HTML for font-family declarations ──
  let htmlHeadingFont = "";
  let htmlBodyFont = "";

  // Google Fonts link tag
  const gfMatch = html.match(/fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/);
  if (gfMatch) {
    const firstFamily = decodeURIComponent(gfMatch[1]).split("|")[0].split(":")[0].replace(/\+/g, " ");
    if (firstFamily && !isSystemFont(firstFamily)) htmlHeadingFont = firstFamily;
  }

  // @font-face src / font-family declarations in <style> tags (custom fonts only)
  const fontFamilyRe = /font-family\s*:\s*['"]?([A-Za-z0-9 _-]+)['"]?/gi;
  const fontMatches: string[] = [];
  let fm: RegExpExecArray | null;
  while ((fm = fontFamilyRe.exec(html)) !== null) {
    const name = fm[1].trim();
    if (!isSystemFont(name) && name.length > 2) {
      fontMatches.push(name);
    }
  }
  if (fontMatches.length > 0 && !htmlHeadingFont) htmlHeadingFont = fontMatches[0];
  if (fontMatches.length > 1 && !htmlBodyFont) htmlBodyFont = fontMatches[1];

  // ── Merge: prefer browser result, fall back to HTML parse ──
  const headingFont = (!isSystemFont(browser.headingFont) && browser.headingFont)
    ? browser.headingFont
    : htmlHeadingFont || "sans-serif";

  const bodyFont = (!isSystemFont(browser.bodyFont) && browser.bodyFont)
    ? browser.bodyFont
    : htmlBodyFont || headingFont || "sans-serif";

  // Default sizes if browser couldn't compute them
  const defaultSizes: Record<string, string> = {
    h1: "2rem", h2: "1.5rem", h3: "1.25rem", h4: "1rem", p: "1rem", small: "0.875rem",
  };
  const sizes = Object.keys(defaultSizes).reduce<Record<string, string>>((acc, tag) => {
    acc[tag] = browser.sizes[tag] ?? defaultSizes[tag];
    return acc;
  }, {});

  return { headingFont, bodyFont, sizes };
}
