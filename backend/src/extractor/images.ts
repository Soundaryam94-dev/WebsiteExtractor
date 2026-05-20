import { Page } from "playwright";

export type ImageCategory =
  | "logo"
  | "hero"
  | "product"
  | "illustration"
  | "icon"
  | "background"
  | "thumbnail"
  | "other";

export interface CategorizedImage {
  url: string;
  category: ImageCategory;
}

export function classifyImageUrl(
  url: string,
  hint?: "meta-logo" | "meta-og" | "background",
): ImageCategory {
  if (hint === "meta-logo")   return "logo";
  if (hint === "meta-og")     return "hero";
  if (hint === "background")  return "background";

  let p = "";
  try { p = new URL(url).pathname.toLowerCase(); } catch { p = url.toLowerCase(); }

  if (/logo|brand|wordmark|logotype/.test(p))                        return "logo";
  if (/hero|banner|cover|masthead|jumbotron|splash/.test(p))         return "hero";
  if (/icon|sprite|favicon/.test(p))                                 return "icon";
  if (/thumb|thumbnail|preview/.test(p))                             return "thumbnail";
  if (/\bbg[-_]|\bbackground\b|\bbackdrop\b|pattern|texture/.test(p)) return "background";
  if (/illustration|drawing|artwork/.test(p))                        return "illustration";
  if (/product|item|catalog/.test(p))                                return "product";
  if (p.endsWith(".svg"))                                            return "icon";

  return "other";
}

export async function extractImages(page: Page, baseUrl: string): Promise<CategorizedImage[]> {
  // ── Layer 0: OG / meta image tags ──
  const metaEntries = await page.evaluate(() => {
    const result: { url: string; hint: string }[] = [];
    for (const sel of [
      "meta[property='og:image']",
      "meta[name='og:image']",
      "meta[property='twitter:image']",
      "meta[name='twitter:image']",
      "meta[property='og:image:secure_url']",
    ]) {
      const val = document.querySelector(sel)?.getAttribute("content");
      if (val && !val.startsWith("data:")) result.push({ url: val, hint: "meta-og" });
    }
    for (const sel of [
      "link[rel='apple-touch-icon']",
      "link[rel='icon'][type='image/png']",
    ]) {
      const val = document.querySelector(sel)?.getAttribute("href");
      if (val && !val.startsWith("data:")) result.push({ url: val, hint: "meta-logo" });
    }
    return result;
  }).catch(() => [] as { url: string; hint: string }[]);

  // ── Layer 1: DOM image elements ──
  const domEntries = await page.evaluate(() => {
    const result: { url: string; hint: string }[] = [];
    const seen = new Set<string>();
    const add = (url: string, hint: string) => {
      if (!url || url.startsWith("data:") || seen.has(url)) return;
      seen.add(url);
      result.push({ url, hint });
    };

    for (const el of Array.from(document.querySelectorAll("img,source"))) {
      const img = el as HTMLImageElement | HTMLSourceElement;
      for (const attr of ["src", "data-src", "data-lazy", "data-lazy-src", "data-original", "data-url"]) {
        const v = img.getAttribute(attr);
        if (v) add(v, "");
      }
      const srcset = img.getAttribute("srcset") ?? img.getAttribute("data-srcset") ?? "";
      for (const part of srcset.split(",")) {
        const u = part.trim().split(/\s+/)[0];
        if (u) add(u, "");
      }
    }

    for (const el of Array.from(document.querySelectorAll("*")).slice(0, 500)) {
      const bg = getComputedStyle(el).backgroundImage;
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match) add(match[1], "background");
    }

    for (const el of Array.from(document.querySelectorAll("image[href],image[xlink\\:href]"))) {
      const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
      if (href) add(href, "");
    }

    return result;
  }).catch(() => [] as { url: string; hint: string }[]);

  // ── Resolve + classify ──
  const resolve = (u: string): string | null => {
    try { return new URL(u, baseUrl).href; } catch { return null; }
  };

  const all: CategorizedImage[] = [];
  const seen = new Set<string>();

  for (const { url, hint } of [...metaEntries, ...domEntries]) {
    const resolved = resolve(url);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    all.push({
      url: resolved,
      category: classifyImageUrl(resolved, hint as "meta-logo" | "meta-og" | "background" | undefined),
    });
  }

  return all.slice(0, 50);
}
