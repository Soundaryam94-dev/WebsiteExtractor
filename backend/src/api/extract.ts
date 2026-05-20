import type { Request, Response } from "express";
import { z } from "zod";
import { scrape } from "../scraper";
import { buildZip } from "../zip/builder";

const bodySchema = z.object({
  url: z.string().url({ message: "A valid URL is required" }),
});

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.", "192.168.", "172."];

function isBlockedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return BLOCKED_HOSTS.some((h) => hostname.startsWith(h) || hostname === h);
  } catch {
    return true;
  }
}

export async function extractRoute(req: Request, res: Response): Promise<void> {
  if (typeof req.body.url === "string" && !/^https?:\/\//i.test(req.body.url.trim())) {
    req.body.url = `https://${req.body.url.trim()}`;
  }

  const parsed = bodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    return;
  }

  const { url } = parsed.data;

  if (isBlockedUrl(url)) {
    res.status(400).json({ success: false, error: "URL not allowed" });
    return;
  }

  try {
    const data = await scrape(url);

    const domain = new URL(url).hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${domain}.zip"`);

    await buildZip(data, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";

    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message });
    }
  }
}
