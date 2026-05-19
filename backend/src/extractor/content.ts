import { Page } from "playwright";
import type { PageContent } from "../scraper";

export async function extractContent(page: Page, html: string): Promise<PageContent> {
  // ── Layer 1: Browser-side (live DOM) ──
  const browser = await page.evaluate(() => {
    const clean = (t: string) => t.replace(/\s+/g, " ").trim();

    // Headings: standard tags + aria role
    const headings: string[] = [];
    const headingEls = Array.from(document.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,[role='heading']"
    )).slice(0, 30);
    for (const el of headingEls) {
      const t = clean(el.textContent ?? "");
      if (t && t.length > 1 && t.length < 200) headings.push(t);
    }

    // Paragraphs: <p> + common content divs/spans
    const paragraphs: string[] = [];
    const paraEls = Array.from(document.querySelectorAll(
      "p,[role='paragraph'],article p,main p,.description,.content p,.subtitle,.tagline"
    )).slice(0, 40);
    for (const el of paraEls) {
      const t = clean(el.textContent ?? "");
      if (t.length > 20 && t.length < 1000) paragraphs.push(t);
      if (paragraphs.length >= 20) break;
    }

    // Buttons / CTAs: broad search
    const buttons: string[] = [];
    const btnEls = Array.from(document.querySelectorAll(
      "button,[role='button'],a.btn,.btn,.button,.cta,[class*='btn'],[class*='button'],[class*='cta']"
    )).slice(0, 20);
    for (const el of btnEls) {
      const t = clean(el.textContent ?? "");
      if (t && t.length < 60) buttons.push(t);
    }

    // Links
    const links: { text: string; href: string }[] = [];
    for (const el of Array.from(document.querySelectorAll("a[href]")).slice(0, 40)) {
      const t = clean(el.textContent ?? "");
      const href = (el as HTMLAnchorElement).href;
      if (t && t.length < 80) links.push({ text: t, href });
    }

    // Nav items: nav/header links + aria navigation
    const navItems: string[] = [];
    const navEls = Array.from(document.querySelectorAll(
      "nav a, header a, [role='navigation'] a, [aria-label*='nav' i] a"
    )).slice(0, 15);
    for (const el of navEls) {
      const t = clean(el.textContent ?? "");
      if (t && t.length < 50) navItems.push(t);
    }

    // Meta description as a paragraph fallback
    const metaDesc = (document.querySelector("meta[name='description']") as HTMLMetaElement)?.content?.trim();

    return { headings, paragraphs, buttons, links, navItems, metaDesc: metaDesc ?? "" };
  }) as { headings: string[]; paragraphs: string[]; buttons: string[]; links: { text: string; href: string }[]; navItems: string[]; metaDesc: string };

  // ── Layer 2: HTML regex fallback (catches content missed by JS rendering) ──
  const htmlHeadings: string[] = [];
  const htmlParagraphs: string[] = [];

  // Extract text from heading tags in raw HTML
  const hTagRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hTagRe.exec(html)) !== null) {
    const t = hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t && t.length > 1 && t.length < 200) htmlHeadings.push(t);
    if (htmlHeadings.length >= 20) break;
  }

  // Extract text from <p> tags in raw HTML
  const pTagRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pTagRe.exec(html)) !== null) {
    const t = pm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t.length > 20 && t.length < 1000) htmlParagraphs.push(t);
    if (htmlParagraphs.length >= 20) break;
  }

  // ── Merge: prefer browser results, fill gaps with HTML parse ──
  const mergeUnique = (a: string[], b: string[]): string[] => {
    const seen = new Set(a.map((s) => s.toLowerCase()));
    return [...a, ...b.filter((s) => !seen.has(s.toLowerCase()))];
  };

  let headings = mergeUnique(browser.headings, htmlHeadings).slice(0, 20);
  let paragraphs = mergeUnique(browser.paragraphs, htmlParagraphs);

  // If still no paragraphs, use meta description
  if (paragraphs.length === 0 && browser.metaDesc) {
    paragraphs = [browser.metaDesc];
  }

  // Deduplicate buttons (remove duplicates from broad selector)
  const buttons = [...new Set(browser.buttons)].slice(0, 10);

  return {
    headings,
    paragraphs: paragraphs.slice(0, 20),
    buttons,
    links: browser.links,
    navItems: [...new Set(browser.navItems)],
  };
}
