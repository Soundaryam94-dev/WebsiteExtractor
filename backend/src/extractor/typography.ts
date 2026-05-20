import { Page } from "playwright";
import type { Typography } from "../scraper";

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
  // ── Layer 1: Browser — @font-face rules + computed styles ──
  const browser = await page.evaluate(() => {
    const SYS = [
      "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
      "ui-serif", "ui-monospace", "sans-serif", "serif", "monospace",
      "segoe ui", "helvetica neue", "helvetica", "arial", "noto sans",
    ];

    // @font-face declarations are the highest-confidence signal for custom brand fonts.
    // They represent fonts the site explicitly loads — not third-party widget fonts.
    const fontFaceNames: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (rule.constructor.name === "CSSFontFaceRule") {
            const name = (rule as CSSStyleRule).style.getPropertyValue("font-family")
              .replace(/['"]/g, "").trim();
            if (name) fontFaceNames.push(name);
          }
        }
      } catch { /* cross-origin sheet */ }
    }

    const brandFont = (el: Element | null): string => {
      if (!el) return "";
      for (const f of getComputedStyle(el).fontFamily.split(",").map((s) => s.replace(/['"]/g, "").trim())) {
        if (f && !SYS.includes(f.toLowerCase())) return f;
      }
      return "";
    };

    const px = (el: Element | null): string => {
      if (!el) return "";
      const s = getComputedStyle(el).fontSize;
      return s && s !== "0px" ? s : "";
    };

    const sizes: Record<string, string> = {};
    for (const tag of ["h1", "h2", "h3", "h4"]) {
      const s = px(document.querySelector(tag));
      if (s) sizes[tag] = s;
    }
    const bodyS = px(document.querySelector("p") ?? document.querySelector("body"));
    if (bodyS) sizes["p"] = bodyS;

    const btnEl = document.querySelector<Element>("button, [role='button'], .btn, input[type='submit']");
    if (btnEl) { const s = px(btnEl); if (s) sizes["button"] = s; }

    for (const sel of ["small", "figcaption", "caption", "label", ".caption", ".label"]) {
      const el = document.querySelector(sel);
      if (el) { const s = px(el); if (s) { sizes["caption"] = s; break; } }
    }

    const navA = document.querySelector<Element>("nav a, [role='navigation'] a, .nav-link");
    if (navA) { const s = px(navA); if (s) sizes["nav"] = s; }

    let headingFont = "";
    for (const sel of ["h1", "h2", "h3", "h4", "header", "nav"]) {
      const f = brandFont(document.querySelector(sel));
      if (f) { headingFont = f; break; }
    }

    let bodyFont = "";
    for (const sel of ["p", "body", "main", "article"]) {
      const f = brandFont(document.querySelector(sel));
      if (f) { bodyFont = f; break; }
    }

    const buttonFont = brandFont(document.querySelector("button, [role='button'], .btn, input[type='submit']"));

    let captionFont = "";
    for (const sel of ["small", "figcaption", "caption", "label"]) {
      const f = brandFont(document.querySelector(sel));
      if (f) { captionFont = f; break; }
    }

    return { fontFaceNames, headingFont, bodyFont, buttonFont, captionFont, sizes };
  }).catch(() => ({
    fontFaceNames: [] as string[],
    headingFont: "", bodyFont: "", buttonFont: "", captionFont: "",
    sizes: {} as Record<string, string>,
  }));

  // ── Layer 2: HTML parse — restricted to <style> tags only ──
  // Never scan <script> content: third-party scripts embed unrelated font-family
  // declarations (widgets, analytics) that pollute the result.
  const styleBlockContent = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  // @font-face in <style> blocks — second-highest confidence after browser @font-face
  const styleFontFaceNames: string[] = [];
  const fontFaceRe = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([A-Za-z0-9 _-]+)['"]?/gi;
  let ffm: RegExpExecArray | null;
  while ((ffm = fontFaceRe.exec(styleBlockContent)) !== null) {
    const name = ffm[1].trim();
    if (!isSystemFont(name) && name.length > 2) styleFontFaceNames.push(name);
  }

  // Google Fonts <link> — reliable but only covers GF-hosted fonts
  let gfFont = "";
  const gfMatch = html.match(/fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/);
  if (gfMatch) {
    const first = decodeURIComponent(gfMatch[1]).split("|")[0].split(":")[0].replace(/\+/g, " ");
    if (first && !isSystemFont(first)) gfFont = first;
  }

  // font-family declarations inside <style> blocks — frequency-ranked, NOT first-match
  const freq: Record<string, number> = {};
  const familyRe = /font-family\s*:\s*['"]?([A-Za-z0-9 _-]+)['"]?/gi;
  let fm: RegExpExecArray | null;
  while ((fm = familyRe.exec(styleBlockContent)) !== null) {
    const name = fm[1].trim();
    if (!isSystemFont(name) && name.length > 2) freq[name] = (freq[name] ?? 0) + 1;
  }
  const byFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([n]) => n);

  // ── Priority merge ──
  // 1. Browser @font-face  2. Browser computed  3. Style @font-face  4. Google Fonts  5. Frequency

  const pickHeading = (): string =>
    browser.fontFaceNames[0] ||
    (browser.headingFont && !isSystemFont(browser.headingFont) ? browser.headingFont : "") ||
    styleFontFaceNames[0] ||
    gfFont ||
    byFreq[0] ||
    "sans-serif";

  const pickBody = (heading: string): string =>
    (browser.bodyFont && !isSystemFont(browser.bodyFont) ? browser.bodyFont : "") ||
    browser.fontFaceNames[1] ||
    styleFontFaceNames[1] ||
    byFreq[1] ||
    heading ||
    "sans-serif";

  const headingFont = pickHeading();
  const bodyFont    = pickBody(headingFont);
  const buttonFont  = (browser.buttonFont && !isSystemFont(browser.buttonFont)) ? browser.buttonFont : bodyFont;
  const captionFont = (browser.captionFont && !isSystemFont(browser.captionFont)) ? browser.captionFont : bodyFont;

  const defaultSizes: Record<string, string> = {
    h1: "2rem", h2: "1.5rem", h3: "1.25rem", h4: "1rem",
    p: "1rem", button: "0.9375rem", caption: "0.75rem", small: "0.875rem",
  };
  const sizes = Object.keys(defaultSizes).reduce<Record<string, string>>((acc, tag) => {
    acc[tag] = browser.sizes[tag] ?? defaultSizes[tag];
    return acc;
  }, {});
  for (const [tag, size] of Object.entries(browser.sizes)) {
    if (!(tag in sizes)) sizes[tag] = size;
  }

  return { headingFont, bodyFont, buttonFont, captionFont, sizes };
}
