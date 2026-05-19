import type { Request, Response } from "express";
import { supabase } from "../lib/supabase";

export async function listExtractions(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from("extractions")
    .select("id, url, title, status, image_count, colors, content_summary, error, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.json({ success: true, data: data ?? [] });
}

export async function deleteExtraction(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ success: false, error: "Missing id" });
    return;
  }

  const { error } = await supabase.from("extractions").delete().eq("id", id);
  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.json({ success: true });
}
