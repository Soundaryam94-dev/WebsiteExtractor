"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { id: "open",    label: "Opening website",        icon: "🌐" },
  { id: "images",  label: "Extracting images",       icon: "🖼️" },
  { id: "colors",  label: "Detecting color palette", icon: "🎨" },
  { id: "fonts",   label: "Analyzing typography",    icon: "🔤" },
  { id: "content", label: "Extracting content",      icon: "📄" },
  { id: "spa",     label: "Generating React SPA",    icon: "⚛️" },
  { id: "zip",     label: "Building ZIP file",       icon: "📦" },
];

type StepState = "pending" | "active" | "done";
type PageStatus = "processing" | "success" | "error";

export default function ProcessingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url") ?? "";

  const [steps, setSteps] = useState<Record<string, StepState>>(
    Object.fromEntries(STEPS.map((s) => [s.id, "pending"]))
  );
  const [, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("processing");
  const [error, setError] = useState("");
  const blobUrlRef = useRef<string | null>(null);
  const apiDoneRef = useRef(false);
  const stepIndexRef = useRef(0);

  useEffect(() => {
    if (!url) { router.replace("/"); return; }

    // ── Animate steps every 3.5s ──
    const STEP_MS = 3500;
    const markActive = (i: number) => {
      if (i >= STEPS.length) return;
      stepIndexRef.current = i;
      setActiveIndex(i);
      setSteps((prev) => ({ ...prev, [STEPS[i].id]: "active" }));
      setProgress(Math.round((i / STEPS.length) * 90));
    };

    markActive(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(
        setTimeout(() => {
          if (apiDoneRef.current) return;
          setSteps((prev) => ({ ...prev, [STEPS[i - 1].id]: "done" }));
          markActive(i);
        }, i * STEP_MS)
      );
    });

    // ── API call — AbortController ensures only one fetch completes ──
    const controller = new AbortController();

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `Server error ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        apiDoneRef.current = true;
        timers.forEach(clearTimeout);

        setSteps(Object.fromEntries(STEPS.map((s) => [s.id, "done"])));
        setProgress(100);

        const href = URL.createObjectURL(blob);
        blobUrlRef.current = href;

        const zipName = (() => {
          try { return new URL(url).hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "") + ".zip"; }
          catch { return "website.zip"; }
        })();
        const a = document.createElement("a");
        a.href = href;
        a.download = zipName;
        a.click();

        setPageStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        apiDoneRef.current = true;
        timers.forEach(clearTimeout);
        setError(err instanceof Error ? err.message : "Extraction failed");
        setPageStatus("error");
      });

    return () => {
      timers.forEach(clearTimeout);
      controller.abort();
    };
  }, [url, router]);

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  // ── Success ──
  if (pageStatus === "success") {
    return (
      <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-500/[0.07] rounded-full blur-[130px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md gap-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Extraction Complete!</h1>
            <p className="text-zinc-400 text-sm">
              <span className="text-purple-400">{hostname}</span> has been extracted and your ZIP is downloading.
            </p>
          </div>

          {/* What's inside */}
          <div className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">ZIP contains</p>
            <div className="grid grid-cols-2 gap-2">
              {["index.html", "design-system.json", "content.json", "assets/images/", "package.json"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="text-green-400">✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            {blobUrlRef.current && (
              <a
                href={blobUrlRef.current}
                download={(() => { try { return new URL(url).hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "") + ".zip"; } catch { return "website.zip"; } })()}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(192,132,252,0.3)] hover:shadow-[0_4px_30px_rgba(192,132,252,0.5)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Again
              </a>
            )}
            <Link
              href="/"
              className="flex-1 h-12 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-sm font-medium hover:bg-white/[0.08] transition-all"
            >
              Extract Another
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Error ──
  if (pageStatus === "error") {
    return (
      <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
        <div className="relative z-10 flex flex-col items-center text-center max-w-md gap-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Extraction Failed</h1>
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-3">{error}</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setPageStatus("processing"); setError(""); window.location.reload(); }}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-sm"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="flex-1 h-12 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-sm"
            >
              Go Back
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Processing ──
  return (
    <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-500/[0.06] rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="font-display font-bold text-lg tracking-wider">
            <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
              WEBSITE EXTRACTOR
            </span>
          </Link>
          <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] w-fit mx-auto">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-zinc-400 truncate max-w-[280px]">{hostname}</span>
          </div>
        </div>

        {/* Steps card */}
        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm p-6 flex flex-col gap-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Extracting</p>
          {STEPS.map((step, i) => {
            const state = steps[step.id];
            return (
              <div key={step.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-500 ${state === "active" ? "bg-purple-500/[0.08] border border-purple-500/20" : "border border-transparent"}`}>
                {/* Icon / spinner / check */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base">
                  {state === "done" ? (
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : state === "active" ? (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <svg className="animate-spin w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <span className="text-xs text-zinc-600">{i + 1}</span>
                    </div>
                  )}
                </div>

                <span className={`text-sm font-medium transition-colors duration-300 ${
                  state === "done" ? "text-zinc-400 line-through decoration-zinc-600" :
                  state === "active" ? "text-white" : "text-zinc-600"
                }`}>
                  {step.label}
                </span>

                {state === "active" && (
                  <span className="ml-auto text-xs text-purple-400 animate-pulse">In progress</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-600 mt-1">This usually takes 15–30 seconds</p>
        </div>
      </div>
    </main>
  );
}
