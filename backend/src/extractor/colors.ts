import { Page } from "playwright";
import type { ColorPalette } from "../scraper";

export async function extractColors(page: Page): Promise<ColorPalette> {
  const raw = await page.evaluate(() => {
    const freq = new Map<string, number>();

    const add = (color: string, weight = 1) => {
      const c = color.trim();
      if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") return;
      freq.set(c, (freq.get(c) ?? 0) + weight);
    };

    // 1. CSS custom properties from all accessible stylesheets (highest weight — brand tokens)
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (rule instanceof CSSStyleRule) {
            const style = (rule as CSSStyleRule).style;
            for (let i = 0; i < style.length; i++) {
              const val = style.getPropertyValue(style[i]).trim();
              if (/^#[0-9a-fA-F]{3,8}$/.test(val)) add(val, 10);
              else if (/^rgb/.test(val) || /^hsl/.test(val)) add(val, 10);
            }
          }
        }
      } catch { /* cross-origin */ }
    }

    // 2. Computed styles from a wide set of elements
    const PROPS = ["color", "backgroundColor", "borderTopColor", "outlineColor"];
    const elements = Array.from(document.querySelectorAll(
      "body,header,nav,main,section,footer,h1,h2,h3,p,button,a,span,div,li,input,svg *"
    )).slice(0, 800);

    for (const el of elements) {
      const s = getComputedStyle(el as Element);
      for (const prop of PROPS) {
        add(s.getPropertyValue(prop), 1);
      }
      // SVG fill / stroke
      const fill = (el as SVGElement).getAttribute?.("fill");
      const stroke = (el as SVGElement).getAttribute?.("stroke");
      if (fill && fill !== "none") add(fill, 3);
      if (stroke && stroke !== "none") add(stroke, 3);
    }

    // 3. Inline style colors on any element
    for (const el of Array.from(document.querySelectorAll("[style]")).slice(0, 200)) {
      const style = (el as HTMLElement).style;
      ["color", "background", "backgroundColor", "borderColor"].forEach((p) => {
        const v = style.getPropertyValue(p);
        if (v) add(v, 5);
      });
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
  });

  const toHex = (c: string): string | null => {
    // already a valid hex
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      const [, r, g, b] = c.match(/^#(.)(.)(.)$/)!;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    // rgb / rgba
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return null;
    return "#" + [m[1], m[2], m[3]]
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("");
  };

  const isNearBlack = (h: string) => {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return r < 15 && g < 15 && b < 15;
  };

  const isNearWhite = (h: string) => {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return r > 240 && g > 240 && b > 240;
  };

  const palette: string[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    const hex = toHex(c);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    palette.push(hex);
  }

  // Separate background candidates (near-white or near-black) from brand colors
  const brandColors = palette.filter((h) => !isNearBlack(h) && !isNearWhite(h));
  const bgCandidates = palette.filter((h) => isNearWhite(h) || isNearBlack(h));

  // Pick background: prefer near-white for light sites, near-black for dark — use most frequent
  const background = bgCandidates[0] ?? palette.find((h) => h.length === 7) ?? "#ffffff";

  return {
    primary: brandColors[0] ?? palette[0] ?? "#1a1a1a",
    secondary: brandColors[1] ?? palette[1] ?? "#4a4a4a",
    accent: brandColors[2] ?? palette[2] ?? "#0066ff",
    background,
    all: palette.slice(0, 24),
  };
}
