import { Page } from "playwright";
import type { Typography } from "../scraper";

export async function extractTypography(page: Page): Promise<Typography> {
  return page.evaluate(() => {
    const sizes: Record<string, string> = {};
    for (const tag of ["h1", "h2", "h3", "h4", "p", "small"]) {
      const el = document.querySelector(tag);
      if (el) sizes[tag] = getComputedStyle(el).fontSize;
    }

    let headingFont = "sans-serif";
    for (const sel of ["h1", "h2", "h3"]) {
      const el = document.querySelector(sel);
      if (el) {
        const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (f) { headingFont = f; break; }
      }
    }

    let bodyFont = "sans-serif";
    for (const sel of ["p", "body"]) {
      const el = document.querySelector(sel);
      if (el) {
        const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (f) { bodyFont = f; break; }
      }
    }

    return { headingFont, bodyFont, sizes };
  }) as Promise<Typography>;
}
