import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import type { ScrapeResult } from "../scraper";

export async function createExtraction(url: string): Promise<string> {
  const { data, error } = await supabase
    .from("extractions")
    .insert({ url, status: "pending" })
    .select("id")
    .single();

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return data.id;
}

export async function completeExtraction(
  id: string,
  result: ScrapeResult
): Promise<void> {
  const { error } = await supabase
    .from("extractions")
    .update({
      status: "completed",
      title: result.title,
      image_count: result.images.length,
      colors: result.colors as unknown as Json,
      typography: result.typography as unknown as Json,
      images: result.images as unknown as Json,
      content: result.content as unknown as Json,
      content_summary: {
        headings: result.content.headings.length,
        paragraphs: result.content.paragraphs.length,
        buttons: result.content.buttons.length,
        links: result.content.links.length,
      } as Json,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) console.error("Failed to update extraction:", error.message);
}

export async function failExtraction(id: string, message: string): Promise<void> {
  const { error } = await supabase
    .from("extractions")
    .update({
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) console.error("Failed to mark extraction as failed:", error.message);
}
