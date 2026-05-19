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

  // ── Layer 1: JSON-LD structured data — richest source for SPAs ──
  const ldHeadings: string[] = [];
  const ldParagraphs: string[] = [];
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
      if (t && t.length < 60) buttons.push(t);
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
