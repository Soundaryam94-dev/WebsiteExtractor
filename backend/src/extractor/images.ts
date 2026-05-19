import { Page } from "playwright";

export async function extractImages(page: Page, baseUrl: string): Promise<string[]> {
  // ── Layer 0: OG / meta image tags — universal fallback ──
  const metaImages = await page.evaluate(() => {
    const urls: string[] = [];
    const selectors = [
      "meta[property='og:image']",
      "meta[name='og:image']",
      "meta[property='twitter:image']",
      "meta[name='twitter:image']",
      "meta[property='og:image:secure_url']",
      "link[rel='apple-touch-icon']",
      "link[rel='icon'][type='image/png']",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const val = el?.getAttribute("content") ?? el?.getAttribute("href");
      if (val && !val.startsWith("data:")) urls.push(val);
    }
    return urls;
  });

  // ── Layer 1: DOM image elements ──
  const domImages = await page.evaluate(() => {
    const urls = new Set<string>();

    for (const el of Array.from(document.querySelectorAll("img,source"))) {
      const img = el as HTMLImageElement | HTMLSourceElement;
      for (const attr of ["src", "data-src", "data-lazy", "data-lazy-src", "data-original", "data-url"]) {
        const val = img.getAttribute(attr);
        if (val && !val.startsWith("data:")) urls.add(val);
      }
      const srcset = img.getAttribute("srcset") ?? img.getAttribute("data-srcset") ?? "";
      for (const part of srcset.split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (url && !url.startsWith("data:")) urls.add(url);
      }
    }

    // CSS background-image
    for (const el of Array.from(document.querySelectorAll("*")).slice(0, 500)) {
      const bg = getComputedStyle(el).backgroundImage;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && !match[1].startsWith("data:")) urls.add(match[1]);
    }

    // SVG <image>
    for (const el of Array.from(document.querySelectorAll("image[href],image[xlink\\:href]"))) {
      const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
      if (href && !href.startsWith("data:")) urls.add(href);
    }

    return Array.from(urls);
  });

  // ── Resolve all URLs ──
  const resolve = (u: string): string | null => {
    try { return new URL(u, baseUrl).href; } catch { return null; }
  };

  const all = [
    ...metaImages.map(resolve).filter((u): u is string => u !== null),
    ...domImages.map(resolve).filter((u): u is string => u !== null),
  ];

  // Deduplicate and limit
  return [...new Set(all)].slice(0, 50);
}
