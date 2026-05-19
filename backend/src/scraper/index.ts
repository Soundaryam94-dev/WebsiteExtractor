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
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // domcontentloaded is fast and works on all sites including ad-heavy ones.
    // networkidle times out on sites with continuous requests (ads, analytics).
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait for the load event, but don't fail if it takes too long
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});

    // Give JS frameworks a moment to render
    await page.waitForTimeout(1500);

    // Wait for any JS-triggered redirects to settle before reading content
    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});

    const title = await page.title().catch(() => new URL(url).hostname);
    const html = await page.content().catch(() => "<html><body></body></html>");

    const [images, colors, typography, content] = await Promise.all([
      extractImages(page, url),
      extractColors(page),
      extractTypography(page),
      extractContent(page),
    ]);

    return { url, title, html, images, colors, typography, content };
  } finally {
    await browser.close();
  }
}
