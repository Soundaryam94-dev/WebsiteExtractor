import { Page } from "playwright";
import type { PageContent } from "../scraper";

export async function extractContent(page: Page, html: string): Promise<PageContent> {
  // ── Layer 0: Meta / OG tags — universal, works on every site ──
  const getMeta = (pattern: RegExp): string => {
    const m = html.match(pattern);
    return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : "";
  };

  const ogTitle       = getMeta(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
                     ?? getMeta(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ?? "";
  const ogDescription = getMeta(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
                     ?? getMeta(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ?? "";
  const metaDesc      = getMeta(/name=["']description["'][^>]*content=["']([^"']+)["']/i)
                     ?? getMeta(/content=["']([^"']+)["'][^>]*name=["']description["']/i) ?? "";
  const ogSiteName    = getMeta(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
                     ?? getMeta(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i) ?? "";

  // ── Layer 1: Browser-side (live DOM) ──
  const browser = await page.evaluate(() => {
    const headings: string[] = [];
    for (const el of Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")).slice(0, 30)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 200) headings.push(t);
    }

    const paragraphs: string[] = [];
    for (const el of Array.from(document.querySelectorAll(
      "p,[role='paragraph'],article p,main p,.description,.content p,.subtitle,.tagline"
    )).slice(0, 40)) {
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t.length > 20 && t.length < 1000) paragraphs.push(t);
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

  // ── Layer 2: Raw HTML regex fallback ──
  const htmlHeadings: string[] = [];
  const hTagRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hTagRe.exec(html)) !== null) {
    const t = hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t && t.length > 1 && t.length < 200) htmlHeadings.push(t);
    if (htmlHeadings.length >= 20) break;
  }

  const htmlParagraphs: string[] = [];
  const pTagRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pTagRe.exec(html)) !== null) {
    const t = pm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t.length > 20 && t.length < 1000) htmlParagraphs.push(t);
    if (htmlParagraphs.length >= 20) break;
  }

  // ── Merge all layers ──
  const mergeUnique = (a: string[], b: string[]): string[] => {
    const seen = new Set(a.map((s) => s.toLowerCase()));
    return [...a, ...b.filter((s) => !seen.has(s.toLowerCase()))];
  };

  // Headings: OG title first if DOM gives nothing
  let headings = mergeUnique(browser.headings, htmlHeadings);
  if (headings.length === 0 && ogTitle) headings = [ogTitle];
  if (ogSiteName && !headings.some((h) => h.toLowerCase().includes(ogSiteName.toLowerCase()))) {
    headings = [ogSiteName, ...headings];
  }

  // Paragraphs: DOM → HTML parse → OG description → meta description
  let paragraphs = mergeUnique(browser.paragraphs, htmlParagraphs);
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
