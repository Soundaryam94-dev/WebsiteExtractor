import { Page } from "playwright";
import type { PageContent } from "../scraper";

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&")
   .replace(/&quot;/g, '"')
   .replace(/&#39;/g, "'")
   .replace(/&lt;/g, "<")
   .replace(/&gt;/g, ">")
   .replace(/&nbsp;/g, " ")
   .trim();

export async function extractContent(page: Page, html: string): Promise<PageContent> {
  // ── Layer 0: Meta / OG tags ──
  const getMeta = (pattern: RegExp): string => {
    const m = html.match(pattern);
    return m ? decodeEntities(m[1]) : "";
  };

  const ogTitle       = getMeta(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
                     || getMeta(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const ogDescription = getMeta(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
                     || getMeta(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  const metaDesc      = getMeta(/name=["']description["'][^>]*content=["']([^"']+)["']/i)
                     || getMeta(/content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const ogSiteName    = getMeta(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
                     || getMeta(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);

  // ── Layer 1: Framework-embedded JSON (Next.js, Nuxt, Gatsby, etc.) ──
  // These frameworks embed ALL initial page data in the HTML before JS runs,
  // so we get real content even when the site blocks headless browsers.
  const ldHeadings: string[] = [];
  const ldParagraphs: string[] = [];

  const isNaturalText = (s: string) =>
    s.length > 2 && s.length < 800 &&
    !s.startsWith("http") &&
    !s.startsWith("/") &&
    !/^[a-z0-9_-]+$/i.test(s) &&  // not an id/slug
    /\s/.test(s);                   // must contain at least one space

  const harvestJson = (obj: unknown, depth = 0): void => {
    if (depth > 8 || obj === null || obj === undefined) return;
    if (typeof obj === "string") {
      const s = decodeEntities(obj);
      if (s.length > 2 && s.length < 200 && isNaturalText(s)) ldHeadings.push(s);
      else if (s.length >= 200 && s.length < 800 && isNaturalText(s)) ldParagraphs.push(s);
      return;
    }
    if (Array.isArray(obj)) { obj.slice(0, 30).forEach((v) => harvestJson(v, depth + 1)); return; }
    if (typeof obj === "object") {
      const skip = new Set(["__typename", "id", "slug", "url", "href", "src", "className",
        "style", "key", "ref", "hash", "token", "signature", "timestamp", "version"]);
      for (const [k, v] of Object.entries(obj as Record<string, unknown>).slice(0, 50)) {
        if (!skip.has(k)) harvestJson(v, depth + 1);
      }
    }
  };

  // Next.js: <script id="__NEXT_DATA__" type="application/json">
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try { harvestJson(JSON.parse(nextDataMatch[1])); } catch { /* skip */ }
  }

  // Nuxt: window.__NUXT__ = {...}
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
  if (nuxtMatch) {
    try { harvestJson(JSON.parse(nuxtMatch[1])); } catch { /* skip */ }
  }

  // Generic: <script>window.__data__ = / window.__APP_STATE__ = / window.__STORE__ =
  const storeMatch = html.match(/window\.__(?:data|APP_STATE|STORE|INITIAL_STATE|REDUX_STATE)__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
  if (storeMatch) {
    try { harvestJson(JSON.parse(storeMatch[1])); } catch { /* skip */ }
  }
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldm: RegExpExecArray | null;
  while ((ldm = ldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(ldm[1]);
      const nodes: unknown[] = Array.isArray(obj)
        ? obj
        : obj["@graph"] ? obj["@graph"] : [obj];
      for (const node of nodes) {
        if (typeof node !== "object" || node === null) continue;
        const n = node as Record<string, unknown>;
        if (typeof n.name === "string" && n.name.length > 1 && n.name.length < 200)
          ldHeadings.push(decodeEntities(n.name));
        if (typeof n.headline === "string" && n.headline.length > 1)
          ldHeadings.push(decodeEntities(n.headline));
        for (const key of ["description", "abstract", "articleBody"]) {
          if (typeof n[key] === "string" && (n[key] as string).length > 20)
            ldParagraphs.push(decodeEntities((n[key] as string).slice(0, 800)));
        }
        // BreadcrumbList items as headings
        if (n["@type"] === "BreadcrumbList" && Array.isArray(n.itemListElement)) {
          for (const item of n.itemListElement as Record<string, unknown>[]) {
            const nm = (item.item as Record<string, unknown>)?.name ?? item.name;
            if (typeof nm === "string" && nm.length > 1) ldHeadings.push(decodeEntities(nm));
          }
        }
      }
    } catch { /* malformed JSON-LD */ }
  }

  // ── Layer 2: Browser-side (live DOM) ──
  const browser = await page.evaluate(() => {
    const headings: string[] = [];
    for (const el of Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).slice(0, 30)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 200) headings.push(t);
    }

    const paragraphs: string[] = [];
    for (const el of Array.from(document.querySelectorAll(
      "p,[role='paragraph'],article p,main p,.description,.content p,.subtitle,.tagline,li"
    )).slice(0, 60)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t.length > 20 && t.length < 600) paragraphs.push(t);
      if (paragraphs.length >= 20) break;
    }

    const buttons: string[] = [];
    for (const el of Array.from(document.querySelectorAll(
      "button,[role='button'],a.btn,.btn,.button,.cta,[class*='btn'],[class*='button'],[class*='cta']"
    )).slice(0, 20)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 60 && !/^\d+$/.test(t)) buttons.push(t);
    }

    const links: { text: string; href: string }[] = [];
    for (const el of Array.from(document.querySelectorAll("a[href]")).slice(0, 40)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const href = (el as HTMLAnchorElement).href;
      if (t && t.length < 80) links.push({ text: t, href });
    }

    const navItems: string[] = [];
    for (const el of Array.from(document.querySelectorAll(
      "nav a,header a,[role='navigation'] a,[aria-label*='nav' i] a"
    )).slice(0, 15)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t && t.length < 50) navItems.push(t);
    }

    return { headings, paragraphs, buttons, links, navItems };
  }).catch(() => ({ headings: [], paragraphs: [], buttons: [], links: [] as { text: string; href: string }[], navItems: [] })) as { headings: string[]; paragraphs: string[]; buttons: string[]; links: { text: string; href: string }[]; navItems: string[] };

  // ── Layer 3: Raw HTML regex fallback ──
  const htmlHeadings: string[] = [];
  const hTagRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hTagRe.exec(html)) !== null) {
    const t = decodeEntities(hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " "));
    if (t && t.length > 1 && t.length < 200) htmlHeadings.push(t);
    if (htmlHeadings.length >= 20) break;
  }

  const htmlParagraphs: string[] = [];
  const pTagRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pTagRe.exec(html)) !== null) {
    const t = decodeEntities(pm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " "));
    if (t.length > 20 && t.length < 600) htmlParagraphs.push(t);
    if (htmlParagraphs.length >= 20) break;
  }

  // ── Merge all layers — prefer browser DOM, then JSON-LD, then HTML regex ──
  const mergeUnique = (a: string[], b: string[]): string[] => {
    const seen = new Set(a.map((s) => s.toLowerCase()));
    return [...a, ...b.filter((s) => !seen.has(s.toLowerCase()))];
  };

  let headings = mergeUnique(browser.headings, mergeUnique(ldHeadings, htmlHeadings));
  if (headings.length === 0 && ogTitle) headings = [ogTitle];
  if (ogSiteName && !headings.some((h) => h.toLowerCase().includes(ogSiteName.toLowerCase()))) {
    headings = [ogSiteName, ...headings];
  }

  let paragraphs = mergeUnique(browser.paragraphs, mergeUnique(ldParagraphs, htmlParagraphs));
  if (ogDescription && !paragraphs.some((p) => p.toLowerCase().includes(ogDescription.slice(0, 30).toLowerCase()))) {
    paragraphs = [ogDescription, ...paragraphs];
  } else if (paragraphs.length === 0 && metaDesc) {
    paragraphs = [metaDesc];
  }

  return {
    headings: headings.slice(0, 20),
    paragraphs: paragraphs.slice(0, 20),
    buttons: [...new Set(browser.buttons)].slice(0, 10),
    links: browser.links,
    navItems: [...new Set(browser.navItems)],
  };
}
