import { Page } from "playwright";
import type { Typography } from "../scraper";

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

    let headingFont = "";
    for (const sel of ["h1", "h2", "h3"]) {
      const el = document.querySelector(sel);
      if (el) {
        const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (f && f !== "sans-serif" && f !== "serif") { headingFont = f; break; }
      }
    }

    let bodyFont = "";
    for (const sel of ["p", "body"]) {
      const el = document.querySelector(sel);
      if (el) {
        const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (f && f !== "sans-serif" && f !== "serif") { bodyFont = f; break; }
      }
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
    if (firstFamily) htmlHeadingFont = firstFamily;
  }

  // font-family declarations in <style> tags
  const fontFamilyRe = /font-family\s*:\s*['"]?([A-Za-z0-9 _-]+)['"]?/gi;
  const fontMatches: string[] = [];
  let fm: RegExpExecArray | null;
  while ((fm = fontFamilyRe.exec(html)) !== null) {
    const name = fm[1].trim();
    const lower = name.toLowerCase();
    if (lower !== "sans-serif" && lower !== "serif" && lower !== "monospace" && name.length > 2) {
      fontMatches.push(name);
    }
  }
  if (fontMatches.length > 0 && !htmlHeadingFont) htmlHeadingFont = fontMatches[0];
  if (fontMatches.length > 1 && !htmlBodyFont) htmlBodyFont = fontMatches[1];

  // ── Merge: prefer browser result, fall back to HTML parse ──
  const headingFont = browser.headingFont || htmlHeadingFont || "sans-serif";
  const bodyFont    = browser.bodyFont    || htmlBodyFont    || headingFont || "sans-serif";

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
