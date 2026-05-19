import { Page } from "playwright";
import type { ColorPalette } from "../scraper";

export async function extractColors(page: Page): Promise<ColorPalette> {
  const raw = await page.evaluate(() => {
    const freq: Record<string, number> = {};

    // 1. Parse raw <style> tag text with regex — works even when computed styles fail
    for (const styleEl of Array.from(document.querySelectorAll("style"))) {
      const text = styleEl.textContent ?? "";
      // hex colors
      const hexMatches = text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      for (const h of hexMatches) freq[h] = (freq[h] ?? 0) + 8;
      // rgb/rgba/hsl values
      const rgbMatches = text.match(/(?:rgb|hsl)a?\([^)]+\)/g) ?? [];
      for (const c of rgbMatches) freq[c] = (freq[c] ?? 0) + 8;
    }

    // 2. CSS stylesheets (same-origin)
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

    // 3. Computed styles from elements
    for (const el of Array.from(document.querySelectorAll(
      "body,header,nav,main,section,footer,h1,h2,h3,p,button,a,span,div,li,img,svg"
    )).slice(0, 600)) {
      const s = getComputedStyle(el as Element);
      for (const prop of ["color", "backgroundColor", "borderTopColor"]) {
        const val = s.getPropertyValue(prop);
        if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
          freq[val] = (freq[val] ?? 0) + 1;
        }
      }
    }

    // 4. SVG fill / stroke attributes
    for (const el of Array.from(document.querySelectorAll("[fill],[stroke]")).slice(0, 300)) {
      const fill = el.getAttribute("fill");
      const stroke = el.getAttribute("stroke");
      if (fill && fill !== "none" && fill !== "currentColor") freq[fill] = (freq[fill] ?? 0) + 4;
      if (stroke && stroke !== "none" && stroke !== "currentColor") freq[stroke] = (freq[stroke] ?? 0) + 4;
    }

    // 5. Inline styles
    for (const el of Array.from(document.querySelectorAll("[style]")).slice(0, 300)) {
      const style = (el as HTMLElement).style;
      for (const prop of ["color", "background", "backgroundColor", "borderColor"]) {
        const v = style.getPropertyValue(prop);
        if (v) freq[v] = (freq[v] ?? 0) + 5;
      }
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
  });

  // Convert any color format → 6-digit hex
  const toHex = (c: string): string | null => {
    c = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      const [, r, g, b] = c.match(/^#(.)(.)(.)$/)!;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{8}$/.test(c)) return c.slice(0, 7).toLowerCase();
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    return "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
  };

  // Saturation: 0 = grey, 1 = vivid — used to rank brand colors
  const saturation = (h: string): number => {
    const r = parseInt(h.slice(1, 3), 16) / 255;
    const g = parseInt(h.slice(3, 5), 16) / 255;
    const b = parseInt(h.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const l = (max + min) / 2;
    return (max - min) / (l < 0.5 ? max + min : 2 - max - min);
  };

  const isNeutral = (h: string): boolean => saturation(h) < 0.08;

  // Build deduplicated palette, preserving frequency order
  const palette: string[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    const hex = toHex(c);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    palette.push(hex);
  }

  // Split into vivid brand colors and neutrals
  const vivid = palette.filter((h) => !isNeutral(h));
  const neutrals = palette.filter((h) => isNeutral(h));

  // Background: prefer a light or dark neutral; fallback to white
  const isLight = (h: string) => parseInt(h.slice(1, 3), 16) > 200;
  const background =
    neutrals.find(isLight) ?? neutrals[0] ?? "#ffffff";

  return {
    primary:   vivid[0] ?? neutrals[0] ?? "#1a1a1a",
    secondary: vivid[1] ?? neutrals[1] ?? "#4a4a4a",
    accent:    vivid[2] ?? vivid[0]    ?? "#0066ff",
    background,
    all: palette.slice(0, 24),
  };
}
