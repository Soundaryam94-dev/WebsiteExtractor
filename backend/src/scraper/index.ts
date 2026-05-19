import { chromium } from "playwright";
import { extractImages } from "../extractor/images";
import { extractColors } from "../extractor/colors";
import { extractTypography } from "../extractor/typography";
import { extractContent } from "../extractor/content";

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  all: string[];
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
  sizes: Record<string, string>;
}

export interface PageContent {
  headings: string[];
  paragraphs: string[];
  buttons: string[];
  links: { text: string; href: string }[];
  navItems: string[];
}

export interface ScrapeResult {
  url: string;
  title: string;
  html: string;
  images: string[];
  colors: ColorPalette;
  typography: Typography;
  content: PageContent;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    // Bypass bot detection: hide navigator.webdriver
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      (window as any).chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});

    // Give React/Vue/Angular time to hydrate
    await page.waitForTimeout(2500);

    // Scroll to trigger lazy-loaded images and below-fold content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});

    const title = await page.title().catch(() => new URL(url).hostname);
    const html = await page.content().catch(() => "<html><body></body></html>");

    const [images, colors, typography, content] = await Promise.all([
      extractImages(page, url),
      extractColors(page, html),
      extractTypography(page, html),
      extractContent(page, html),
    ]);

    return { url, title, html, images, colors, typography, content };
  } finally {
    await browser.close();
  }
}
