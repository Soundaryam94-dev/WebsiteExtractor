"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Extraction {
  id: string;
  url: string;
  title: string | null;
  status: string;
  image_count: number;
  colors: { primary: string; secondary: string; accent: string; background: string; all: string[] } | null;
  typography: { headingFont: string; bodyFont: string; sizes: Record<string, string> } | null;
  images: string[] | null;
  content: {
    headings: string[];
    paragraphs: string[];
    buttons: string[];
    navItems: string[];
    links: { text: string; href: string }[];
  } | null;
  content_summary: { headings: number; paragraphs: number; buttons: number; links: number } | null;
  created_at: string;
}

function getHost(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ExtractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: auth }) => {
      if (!auth.user) { router.replace("/login"); return; }

      supabase
        .from("extractions")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data: row, error }) => {
          if (error || !row) { router.replace("/dashboard"); return; }
          setData(row as unknown as Extraction);
          setLoading(false);
        });
    });
  }, [id, router]);

  const handleCopy = (hex: string) => {
    copyToClipboard(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!data) return null;

  const validImages = (data.images ?? []).filter((u) => !imgErrors.has(u));

  return (
    <main className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-4 px-6 md:px-10 py-4 bg-dark-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-white text-sm truncate">{data.title ?? getHost(data.url)}</span>

        <div className="ml-auto flex gap-3">
          <Link
            href={`/processing?url=${encodeURIComponent(data.url)}`}
            className="h-9 px-4 flex items-center rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white text-sm font-semibold shadow-[0_4px_15px_rgba(192,132,252,0.25)] hover:shadow-[0_4px_25px_rgba(192,132,252,0.45)] transition-all"
          >
            Extract Again
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 flex flex-col gap-12">

        {/* Page title */}
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{data.title ?? getHost(data.url)}</h1>
          <a href={data.url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors mt-1 block">
            {data.url}
          </a>
        </div>

        {/* ── Color Palette ── */}
        {data.colors && (
          <section>
            <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shrink-0" />
              Color Palette
            </h2>

            {/* Main 4 colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {(["primary", "secondary", "accent", "background"] as const).map((key) => {
                const hex = data.colors![key];
                return (
                  <button
                    key={key}
                    onClick={() => handleCopy(hex)}
                    className="group flex flex-col gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 hover:border-white/[0.18] transition-all text-left"
                  >
                    <div className="w-full h-16 rounded-xl border border-white/10" style={{ backgroundColor: hex }} />
                    <div>
                      <p className="text-xs text-zinc-500 capitalize">{key}</p>
                      <p className="text-sm text-white font-mono mt-0.5">{hex}</p>
                    </div>
                    <span className="text-xs text-zinc-600 group-hover:text-purple-400 transition-colors">
                      {copiedColor === hex ? "✓ Copied!" : "Click to copy"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Full palette swatches */}
            {data.colors.all.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">All extracted colors</p>
                <div className="flex flex-wrap gap-3">
                  {data.colors.all.map((hex, i) => (
                    <button
                      key={i}
                      onClick={() => handleCopy(hex)}
                      title={hex}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <div className="w-10 h-10 rounded-xl border border-white/10 shadow-sm" style={{ backgroundColor: hex }} />
                      <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 font-mono transition-colors">
                        {copiedColor === hex ? "✓" : hex.slice(0, 7)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Typography ── */}
        {data.typography && (
          <section>
            <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
              Typography
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Heading font */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Heading Font</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: data.typography.headingFont }}>
                  {data.typography.headingFont}
                </p>
                <p className="text-sm text-zinc-400 mt-2" style={{ fontFamily: data.typography.headingFont }}>
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="text-xs font-mono text-purple-400 mt-3">{data.typography.headingFont}</p>
              </div>

              {/* Body font */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Body Font</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: data.typography.bodyFont }}>
                  {data.typography.bodyFont}
                </p>
                <p className="text-sm text-zinc-400 mt-2" style={{ fontFamily: data.typography.bodyFont }}>
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="text-xs font-mono text-purple-400 mt-3">{data.typography.bodyFont}</p>
              </div>
            </div>

            {/* Type scale */}
            {Object.keys(data.typography.sizes).length > 0 && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Type Scale</p>
                <div className="flex flex-col gap-3">
                  {Object.entries(data.typography.sizes).map(([tag, size]) => (
                    <div key={tag} className="flex items-baseline gap-4">
                      <span className="text-xs font-mono text-zinc-600 w-8">{tag}</span>
                      <span className="text-white" style={{ fontSize: size, fontFamily: ["h1","h2","h3","h4"].includes(tag) ? data.typography!.headingFont : data.typography!.bodyFont }}>
                        {tag.toUpperCase()} — {size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Image Gallery ── */}
        <section>
          <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image Gallery
            <span className="text-sm font-normal text-zinc-500 ml-1">({data.image_count} images)</span>
          </h2>

          {validImages.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-10 text-center text-zinc-500 text-sm">
              No image URLs stored — re-extract this site to capture images.
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {validImages.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-white/[0.06] hover:border-purple-400/40 transition-all group break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300 bg-white/[0.04]"
                    onError={() => setImgErrors((prev) => new Set(prev).add(src))}
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ── Content ── */}
        {data.content && data.content.headings.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Extracted Content
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Headings */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Headings</p>
                <ul className="flex flex-col gap-2">
                  {data.content.headings.slice(0, 8).map((h, i) => (
                    <li key={i} className="text-sm text-white truncate">{h}</li>
                  ))}
                </ul>
              </div>
              {/* Buttons / CTAs */}
              {data.content.buttons.length > 0 && (
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Buttons / CTAs</p>
                  <div className="flex flex-wrap gap-2">
                    {data.content.buttons.map((b, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{b}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
