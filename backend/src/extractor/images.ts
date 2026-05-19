import { Page } from "playwright";

export async function extractImages(page: Page, baseUrl: string): Promise<string[]> {
  const found = await page.evaluate(() => {
    const urls = new Set<string>();

    // Standard src + lazy-load attributes
    for (const el of Array.from(document.querySelectorAll("img,source"))) {
      const img = el as HTMLImageElement | HTMLSourceElement;
      for (const attr of ["src", "data-src", "data-lazy", "data-lazy-src", "data-original", "data-url"]) {
        const val = img.getAttribute(attr);
        if (val && !val.startsWith("data:")) urls.add(val);
      }
      // srcset — pick the first URL from each entry
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

    // SVG <image> elements
    for (const el of Array.from(document.querySelectorAll("image[href],image[xlink\\:href]"))) {
      const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
      if (href && !href.startsWith("data:")) urls.add(href);
    }

    return Array.from(urls);
  });

  return found
    .map((u) => {
      try { return new URL(u, baseUrl).href; } catch { return null; }
    })
    .filter((u): u is string => u !== null)
    .slice(0, 50);
}
