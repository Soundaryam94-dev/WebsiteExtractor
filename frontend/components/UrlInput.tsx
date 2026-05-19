"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UrlInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleExtract = () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      setError("Please enter a valid URL including https://");
      return;
    }

    router.push(`/processing?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleExtract()}
            placeholder="Enter website URL..."
            className="w-full h-16 pl-14 pr-6 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] text-white placeholder-slate-400 text-base outline-none focus:border-purple-400 focus:shadow-[0_0_0_1px_#C084FC,0_4px_20px_rgba(192,132,252,0.15)] transition-all duration-300"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleExtract}
          disabled={!url.trim()}
          className="h-16 px-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold tracking-widest text-sm shadow-[0_8px_30px_rgba(192,132,252,0.25)] hover:shadow-[0_8px_40px_rgba(192,132,252,0.45)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap"
        >
          EXTRACT ASSETS
        </button>
      </div>

      {/* Validation error */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
