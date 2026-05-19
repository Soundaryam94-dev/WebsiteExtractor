import { Page } from "playwright";
import type { ColorPalette } from "../scraper";

export async function extractColors(page: Page): Promise<ColorPalette> {
  const raw = await page.evaluate(() => {
    // Use plain object (not Map) and inline all logic — avoids esbuild __name injection
    const freq: Record<string, number> = {};

    // 1. CSS stylesheets — highest weight (brand tokens)
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          const style = (rule as CSSStyleRule).style;
          if (!style) continue;
          for (let i = 0; i < style.length; i++) {
            const val = style.getPropertyValue(style[i]).trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgb/.test(val) || /^hsl/.test(val)) {
              freq[val] = (freq[val] ?? 0) + 10;
            }
          }
        }
      } catch { /* cross-origin stylesheet */ }
    }

    // 2. Computed styles from a wide element sample
    const elements = Array.from(document.querySelectorAll(
      "body,header,nav,main,section,footer,h1,h2,h3,p,button,a,span,div,li,input"
    )).slice(0, 800);

    for (const el of elements) {
      const s = getComputedStyle(el as Element);
      for (const prop of ["color", "backgroundColor", "borderTopColor", "outlineColor"]) {
        const val = s.getPropertyValue(prop);
        if (val && val !== "rgba(0, 0, 0, 0)" && val !== "transparent") {
          freq[val] = (freq[val] ?? 0) + 1;
        }
      }
    }

    // 3. SVG fill / stroke attributes
    for (const el of Array.from(document.querySelectorAll("[fill],[stroke]")).slice(0, 200)) {
      const fill = el.getAttribute("fill");
      const stroke = el.getAttribute("stroke");
      if (fill && fill !== "none") freq[fill] = (freq[fill] ?? 0) + 3;
      if (stroke && stroke !== "none") freq[stroke] = (freq[stroke] ?? 0) + 3;
    }

    // 4. Inline style attributes
    for (const el of Array.from(document.querySelectorAll("[style]")).slice(0, 200)) {
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

  const toHex = (c: string): string | null => {
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      const [, r, g, b] = c.match(/^#(.)(.)(.)$/)!;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    return "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
  };

  const isNearBlack = (h: string) =>
    parseInt(h.slice(1, 3), 16) < 20 && parseInt(h.slice(3, 5), 16) < 20 && parseInt(h.slice(5, 7), 16) < 20;

  const isNearWhite = (h: string) =>
    parseInt(h.slice(1, 3), 16) > 235 && parseInt(h.slice(3, 5), 16) > 235 && parseInt(h.slice(5, 7), 16) > 235;

  const palette: string[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    const hex = toHex(c);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    palette.push(hex);
  }

  const brandColors = palette.filter((h) => !isNearBlack(h) && !isNearWhite(h));
  const background = palette.find((h) => isNearWhite(h) || isNearBlack(h)) ?? "#ffffff";

  return {
    primary:    brandColors[0] ?? palette[0] ?? "#1a1a1a",
    secondary:  brandColors[1] ?? palette[1] ?? "#4a4a4a",
    accent:     brandColors[2] ?? palette[2] ?? "#0066ff",
    background,
    all: palette.slice(0, 24),
  };
}
