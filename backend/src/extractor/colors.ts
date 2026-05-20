import { Page } from "playwright";
import type { ColorPalette } from "../scraper";

export async function extractColors(page: Page, html: string): Promise<ColorPalette> {
  const nodeFreq: Record<string, number> = {};

  // ── Layer 0: Meta tags — most reliable brand color on any site ──
  const themeColorMatch = html.match(/name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  if (themeColorMatch) nodeFreq[themeColorMatch[1].trim()] = (nodeFreq[themeColorMatch[1].trim()] ?? 0) + 50;

  const tileColorMatch = html.match(/name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/content=["']([^"']+)["'][^>]*name=["']msapplication-TileColor["']/i);
  if (tileColorMatch) nodeFreq[tileColorMatch[1].trim()] = (nodeFreq[tileColorMatch[1].trim()] ?? 0) + 30;

  // ── Layer 1: Hex and rgb() in raw HTML ──
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(html)) !== null) {
    nodeFreq["#" + m[1]] = (nodeFreq["#" + m[1]] ?? 0) + 5;
  }

  const rgbRe = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((m = rgbRe.exec(html)) !== null) {
    const hex = "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
    nodeFreq[hex] = (nodeFreq[hex] ?? 0) + 5;
  }

  // ── Layer 2: Browser-side extraction ──
  const browserRaw = await page.evaluate(() => {
    const freq: Record<string, number> = {};

    // CSS custom properties on :root — the design system of every modern site
    // Scan all stylesheet rules for custom property declarations (--color-*, --primary, etc.)
    const cssVarRe = /--(color|primary|secondary|accent|brand|theme|cta|hero|link|button|bg|background)[-\w]*/i;
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          const styleRule = rule as CSSStyleRule;
          if (!styleRule.style) continue;
          for (let i = 0; i < styleRule.style.length; i++) {
            const prop = styleRule.style[i];
            if (!cssVarRe.test(prop)) continue;
            // Resolve the variable's actual value from :root
            const resolved = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
            if (resolved && /^#|^rgb|^hsl/.test(resolved)) {
              freq[resolved] = (freq[resolved] ?? 0) + 40;
            }
          }
        }
      } catch { /* cross-origin */ }
    }

    // Inline <style> blocks
    for (const styleEl of Array.from(document.querySelectorAll("style"))) {
      const text = styleEl.textContent ?? "";
      for (const h of text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) freq[h] = (freq[h] ?? 0) + 8;
      for (const c of text.match(/(?:rgb|hsl)a?\([^)]+\)/g) ?? []) freq[c] = (freq[c] ?? 0) + 8;
    }

    // Stylesheet rule values
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          const style = (rule as CSSStyleRule).style;
          if (!style) continue;
          for (let i = 0; i < style.length; i++) {
            const val = style.getPropertyValue(style[i]).trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgb/.test(val) || /^hsl/.test(val)) {
              freq[val] = (freq[val] ?? 0) + 6;
            }
          }
        }
      } catch { /* cross-origin */ }
    }

    // Body background — most reliable background signal on any site
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
      freq[bodyBg] = (freq[bodyBg] ?? 0) + 25;
    }

    // Semantic high-value elements — nav/header/button carry the brand color on every site
    const semanticTargets: Array<{ selector: string; weight: number; props: string[] }> = [
      { selector: "header, nav, [role='navigation'], [role='banner']",         weight: 15, props: ["backgroundColor", "color"] },
      { selector: "button, [role='button'], input[type='submit'], input[type='button']", weight: 12, props: ["backgroundColor", "color", "borderTopColor"] },
      { selector: "[class*='btn'], [class*='button'], [class*='cta']",         weight: 12, props: ["backgroundColor", "color"] },
      { selector: "[class*='primary'], [class*='brand'], [class*='hero'], [class*='accent']", weight: 10, props: ["backgroundColor", "color"] },
      { selector: "a",                                                          weight: 6,  props: ["color"] },
      { selector: "footer",                                                     weight: 8,  props: ["backgroundColor", "color"] },
    ];
    for (const { selector, weight, props } of semanticTargets) {
      try {
        for (const el of Array.from(document.querySelectorAll(selector)).slice(0, 60)) {
          const s = getComputedStyle(el as Element);
          for (const prop of props) {
            const val = s.getPropertyValue(prop);
            if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
              freq[val] = (freq[val] ?? 0) + weight;
            }
          }
        }
      } catch { /* skip */ }
    }

    // General elements — lower weight, broad coverage
    for (const el of Array.from(document.querySelectorAll(
      "body,header,nav,main,section,footer,h1,h2,h3,p,button,a,span,div,li"
    )).slice(0, 600)) {
      const s = getComputedStyle(el as Element);
      for (const prop of ["color", "backgroundColor", "borderTopColor"]) {
        const val = s.getPropertyValue(prop);
        if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
          freq[val] = (freq[val] ?? 0) + 1;
        }
      }
    }

    // SVG fills/strokes (logos, icons)
    for (const el of Array.from(document.querySelectorAll("[fill],[stroke]")).slice(0, 300)) {
      const fill = el.getAttribute("fill");
      const stroke = el.getAttribute("stroke");
      if (fill && fill !== "none" && fill !== "currentColor") freq[fill] = (freq[fill] ?? 0) + 4;
      if (stroke && stroke !== "none" && stroke !== "currentColor") freq[stroke] = (freq[stroke] ?? 0) + 4;
    }

    // Inline styles
    for (const el of Array.from(document.querySelectorAll("[style]")).slice(0, 300)) {
      const style = (el as HTMLElement).style;
      for (const prop of ["color", "background", "backgroundColor", "borderColor"]) {
        const v = style.getPropertyValue(prop);
        if (v) freq[v] = (freq[v] ?? 0) + 5;
      }
    }

    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }).catch(() => [] as string[]);

  // ── Merge ──
  const merged: Record<string, number> = { ...nodeFreq };
  for (const c of browserRaw) merged[c] = (merged[c] ?? 0) + 3;

  const toHex = (c: string): string | null => {
    c = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      const [, r, g, b] = c.match(/^#(.)(.)(.)$/)!;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{8}$/.test(c)) return c.slice(0, 7).toLowerCase();
    const mx = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!mx) return null;
    return "#" + [mx[1], mx[2], mx[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
  };

  const saturation = (h: string): number => {
    const r = parseInt(h.slice(1, 3), 16) / 255;
    const g = parseInt(h.slice(3, 5), 16) / 255;
    const b = parseInt(h.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const l = (max + min) / 2;
    return (max - min) / (l < 0.5 ? max + min : 2 - max - min);
  };

  // Proper perceptual luminance — not just the R channel
  const luminance = (h: string): number =>
    0.299 * parseInt(h.slice(1, 3), 16) +
    0.587 * parseInt(h.slice(3, 5), 16) +
    0.114 * parseInt(h.slice(5, 7), 16);

  const palette: string[] = [];
  const seen = new Set<string>();
  for (const [c] of Object.entries(merged).sort((a, b) => b[1] - a[1])) {
    const hex = toHex(c);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    palette.push(hex);
  }

  const isNeutral = (h: string) => saturation(h) < 0.1;
  const isLight   = (h: string) => luminance(h) > 200;

  const vivid    = palette.filter((h) => !isNeutral(h));
  const neutrals = palette.filter((h) => isNeutral(h));
  const background = neutrals.find(isLight) ?? neutrals[0] ?? "#ffffff";

  return {
    primary:   vivid[0] ?? neutrals[0] ?? "#1a1a1a",
    secondary: vivid[1] ?? neutrals[1] ?? "#4a4a4a",
    accent:    vivid[2] ?? vivid[0]    ?? "#0066ff",
    background,
    all: palette.slice(0, 24),
  };
}
