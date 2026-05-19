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

export interface CapturedImage {
  filename: string;
  buffer: Buffer;
}

export interface ScrapeResult {
  url: string;
  title: string;
  html: string;
  images: string[];
  capturedImages: CapturedImage[];
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
      "--disable-dev-shm-usage",       // critical on Render/Linux — /dev/shm is only 64MB
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-http2",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
    });

    // Stronger anti-bot fingerprint spoofing
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
      Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      Object.defineProperty(navigator, "platform", { get: () => "Win32" });
      Object.defineProperty(navigator, "plugins", {
        get: () => [
          { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
          { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
          { name: "Native Client", filename: "internal-nacl-plugin" },
        ],
      });
      (window as any).chrome = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {},
      };
      // Mask Permissions API
      const origQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions);
      if (origQuery) {
        (window.navigator.permissions as any).query = (params: PermissionDescriptor) =>
          params.name === "notifications"
            ? Promise.resolve({ state: "denied" } as PermissionStatus)
            : origQuery(params);
      }
    });

    const page = await context.newPage();

    // Intercept image responses during page load — browser fetches with proper cookies/headers
    const capturedImages: CapturedImage[] = [];
    const seenImageUrls = new Set<string>();

    await page.route(/\.(png|jpe?g|gif|webp|svg|ico|avif)(\?.*)?$/i, async (route) => {
      try {
        const response = await route.fetch();
        const reqUrl = route.request().url();

        if (response.ok() && !seenImageUrls.has(reqUrl) && capturedImages.length < 30) {
          const body = await response.body();
          // Only keep images between 1KB and 5MB
          if (body.length > 1024 && body.length < 5 * 1024 * 1024) {
            const ext = reqUrl.match(/\.(png|jpe?g|gif|webp|svg|ico|avif)/i)?.[0] ?? ".png";
            const slug = Math.random().toString(36).slice(2, 8);
            capturedImages.push({ filename: `${slug}${ext}`, buffer: body });
            seenImageUrls.add(reqUrl);
          }
        }
        await route.fulfill({ response });
      } catch {
        await route.continue();
      }
    });

    // Use "commit" (first-byte) as primary — resolves immediately on bot-protected sites
    // that stall on domcontentloaded. Then let load states settle in the background.
    const response = await page.goto(url, { waitUntil: "commit", timeout: 30_000 })
      .catch((err: Error) => {
        const msg = err.message;
        if (msg.includes("ERR_HTTP2_PROTOCOL_ERROR"))
          throw new Error("This site has an HTTP/2 compatibility issue and cannot be accessed.");
        if (msg.includes("ERR_NAME_NOT_RESOLVED"))
          throw new Error("Domain not found. Please check the URL and try again.");
        if (msg.includes("ERR_CONNECTION_REFUSED"))
          throw new Error("Connection refused. The site may be down or blocking automated access.");
        if (msg.includes("Timeout") || msg.includes("timeout"))
          throw new Error("The site took too long to respond. It may be blocking automated access or is temporarily down.");
        throw new Error(`Could not load the page: ${msg.split("\n")[0]}`);
      });

    // Hard block on 403/401/503
    const status = response?.status() ?? 200;
    if (status === 401 || status === 403) {
      throw new Error(`Access denied (HTTP ${status}). This site blocks automated access.`);
    }

    // Wait for HTML + JS to settle (short caps — never block longer than needed)
    await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});

    // Give React/Vue/Angular time to hydrate
    await page.waitForTimeout(1500);

    // Scroll to trigger lazy-loaded images
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.waitForTimeout(300);

    const title = await page.title().catch(() => new URL(url).hostname);

    // Detect bot-protection / access-denied pages
    const blockedTitles = [
      "access denied", "403 forbidden", "just a moment", "attention required",
      "cloudflare", "robot", "captcha", "are you human", "security check",
      "ddos protection", "checking your browser", "please wait",
    ];
    const titleLower = title.toLowerCase();
    if (blockedTitles.some((t) => titleLower.includes(t))) {
      throw new Error(
        `This site is protected by bot detection (${title}). Try a different URL.`
      );
    }
    const html = await page.content().catch(() => "<html><body></body></html>");

    const [images, colors, typography, content] = await Promise.all([
      extractImages(page, url),
      extractColors(page, html),
      extractTypography(page, html),
      extractContent(page, html),
    ]);

    return { url, title, html, images, capturedImages, colors, typography, content };
  } finally {
    await browser.close();
  }
}
