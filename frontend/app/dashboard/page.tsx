"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Extraction {
  id: string;
  url: string;
  title: string | null;
  status: "pending" | "completed" | "failed";
  image_count: number;
  colors: { all: string[]; primary: string; secondary: string } | null;
  content_summary: { headings: number; paragraphs: number; buttons: number; links: number } | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_STYLE = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed:    "bg-red-500/10 text-red-400 border-red-500/20",
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function getHost(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newUrlError, setNewUrlError] = useState("");

  const handleNewExtraction = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch {
      setNewUrlError("Please enter a valid URL including https://");
      return;
    }
    router.push(`/processing?url=${encodeURIComponent(trimmed)}`);
  };

  useEffect(() => {
    supabase
      .from("extractions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data: rows }) => {
        setExtractions((rows as Extraction[]) ?? []);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("extractions").delete().eq("id", id);
    setExtractions((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  };

  const total     = extractions.length;
  const completed = extractions.filter((e) => e.status === "completed").length;
  const failed    = extractions.filter((e) => e.status === "failed").length;

  if (loading) {
    return (
      <main className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark-950 pb-20">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-dark-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <Link href="/" className="font-display font-bold text-base tracking-wider">
          <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
            ASSET EXTRACTOR
          </span>
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 flex flex-col gap-10">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Your extraction history and stats.</p>
        </div>

        {/* Inline new extraction */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
          <p className="text-sm text-zinc-400 mb-3">Extract a new site</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => { setNewUrl(e.target.value); setNewUrlError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleNewExtraction()}
              placeholder="https://example.com"
              className="flex-1 h-11 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 text-sm outline-none focus:border-purple-400 focus:shadow-[0_0_0_1px_#C084FC] transition-all"
            />
            <button
              onClick={handleNewExtraction}
              disabled={!newUrl.trim()}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_4px_20px_rgba(192,132,252,0.35)] transition-all whitespace-nowrap"
            >
              Extract Assets
            </button>
          </div>
          {newUrlError && <p className="text-xs text-red-400 mt-2">{newUrlError}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Extractions", value: total,     color: "text-white" },
            { label: "Completed",         value: completed, color: "text-green-400" },
            { label: "Failed",            value: failed,    color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 flex flex-col gap-1">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">{s.label}</span>
              <span className={`text-4xl font-bold font-display ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Extractions list */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Recent Extractions</h2>

          {extractions.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
              <p className="text-zinc-500 text-sm">No extractions yet.</p>
              <Link href="/" className="inline-block mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white text-sm font-semibold">
                Extract your first site
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {extractions.map((ex) => (
                <div key={ex.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">{ex.title ?? getHost(ex.url)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[ex.status]}`}>{ex.status}</span>
                    </div>
                    <a href={ex.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-purple-400 transition-colors truncate block mt-0.5">
                      {getHost(ex.url)}
                    </a>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {ex.image_count > 0 && <span className="text-xs text-zinc-500">{ex.image_count} images</span>}
                      {ex.content_summary && (
                        <span className="text-xs text-zinc-500">
                          {ex.content_summary.headings} headings · {ex.content_summary.paragraphs} paragraphs
                        </span>
                      )}
                      {ex.colors?.all && ex.colors.all.length > 0 && (
                        <div className="flex gap-1">
                          {ex.colors.all.slice(0, 6).map((c, i) => (
                            <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      )}
                      {ex.error && <span className="text-xs text-red-400 truncate max-w-[200px]">{ex.error}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                    <span className="text-xs text-zinc-600">{timeAgo(ex.created_at)}</span>
                    <Link href={`/processing?url=${encodeURIComponent(ex.url)}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors whitespace-nowrap">
                      {ex.status === "failed" ? "Retry" : "Extract Again"}
                    </Link>
                    <button onClick={() => handleDelete(ex.id)} disabled={deletingId === ex.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/[0.07] border border-red-500/20 text-red-400 hover:bg-red-500/15 disabled:opacity-40 transition-colors whitespace-nowrap">
                      {deletingId === ex.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
