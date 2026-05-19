import { Page } from "playwright";

export async function extractImages(page: Page, baseUrl: string): Promise<string[]> {
  const found = await page.evaluate(() => {
    const urls = new Set<string>();

    document.querySelectorAll("img[src]").forEach((el) => {
      const src = (el as HTMLImageElement).src;
      if (src && !src.startsWith("data:")) urls.add(src);
    });

    document.querySelectorAll("*").forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && !match[1].startsWith("data:")) urls.add(match[1]);
    });

    return Array.from(urls);
  });

  return found
    .map((u) => {
      try {
        return new URL(u, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((u): u is string => u !== null)
    .slice(0, 50);
}
