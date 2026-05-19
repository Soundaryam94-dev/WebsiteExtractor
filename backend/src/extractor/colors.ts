import { Page } from "playwright";
import type { ColorPalette } from "../scraper";

export async function extractColors(page: Page): Promise<ColorPalette> {
  const raw = await page.evaluate(() => {
    const colors = new Set<string>();
    const tags = ["body", "header", "nav", "main", "section", "footer", "h1", "p", "button", "a"];

    tags.forEach((tag) => {
      document.querySelectorAll(tag).forEach((el) => {
        const s = getComputedStyle(el);
        [s.color, s.backgroundColor, s.borderColor].forEach((c) => {
          if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") colors.add(c);
        });
      });
    });

    return Array.from(colors);
  });

  const toHex = (rgb: string): string => {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return rgb;
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => parseInt(n).toString(16).padStart(2, "0"))
        .join("")
    );
  };

  const palette = [
    ...new Set(
      raw
        .map(toHex)
        .filter((c) => c.startsWith("#") && c !== "#000000" && c !== "#ffffff")
    ),
  ];

  return {
    primary: palette[0] ?? "#1a1a1a",
    secondary: palette[1] ?? "#ffffff",
    accent: palette[2] ?? "#0066ff",
    background: palette.find((c) => c.length === 7) ?? "#ffffff",
    all: palette.slice(0, 20),
  };
}
