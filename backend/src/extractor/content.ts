import { Page } from "playwright";
import type { PageContent } from "../scraper";

export async function extractContent(page: Page): Promise<PageContent> {
  return page.evaluate(() => {
    const headings: string[] = [];
    for (const el of Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).slice(0, 20)) {
      const t = el.textContent?.trim() ?? "";
      if (t) headings.push(t);
    }

    const paragraphs: string[] = [];
    for (const el of Array.from(document.querySelectorAll("p")).slice(0, 30)) {
      const t = el.textContent?.trim() ?? "";
      if (t.length > 20) paragraphs.push(t);
      if (paragraphs.length >= 20) break;
    }

    const buttons: string[] = [];
    for (const el of Array.from(document.querySelectorAll("button,[role='button'],a.btn,.button,.cta")).slice(0, 10)) {
      const t = el.textContent?.trim() ?? "";
      if (t) buttons.push(t);
    }

    const links: { text: string; href: string }[] = [];
    for (const el of Array.from(document.querySelectorAll("a[href]")).slice(0, 30)) {
      const t = el.textContent?.trim() ?? "";
      if (t) links.push({ text: t, href: (el as HTMLAnchorElement).href });
    }

    const navItems: string[] = [];
    for (const el of Array.from(document.querySelectorAll("nav a, header a")).slice(0, 10)) {
      const t = el.textContent?.trim() ?? "";
      if (t) navItems.push(t);
    }

    return { headings, paragraphs, buttons, links, navItems };
  }) as Promise<PageContent>;
}
