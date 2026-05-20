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
  const activeIndex = STEPS.findIndex((s) => steps[s.id] === "active");
  const activeStep = STEPS[activeIndex] ?? STEPS[0];
  const doneCount = STEPS.filter((s) => steps[s.id] === "done").length;

  return (
    <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-500/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-3">
          <Link href="/" className="font-display font-bold text-xl tracking-wider">
            <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
              WEBSITE EXTRACTOR
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] w-fit mx-auto">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
            <span className="text-xs text-zinc-400 truncate max-w-[320px]">{hostname}</span>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm overflow-hidden">

          {/* Horizontal stepper */}
          <div className="px-8 pt-7 pb-6">
            <div className="flex items-start justify-between">
              {STEPS.map((step, i) => {
                const state = steps[step.id];
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                        state === "done"
                          ? "bg-green-500/15 border border-green-500/30"
                          : state === "active"
                          ? "bg-purple-500/15 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                          : "bg-white/[0.04] border border-white/[0.08]"
                      }`}>
                        {state === "done" ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : state === "active" ? (
                          <svg className="animate-spin w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <span className="text-xs text-zinc-600 font-medium">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-[9px] text-center leading-tight w-14 transition-colors duration-300 ${
                        state === "done" ? "text-green-500" :
                        state === "active" ? "text-purple-300 font-semibold" : "text-zinc-700"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px mx-1.5 mb-5 relative overflow-hidden rounded-full">
                        <div className="absolute inset-0 bg-white/[0.06]" />
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500/50 to-green-400/30 transition-all duration-700"
                          style={{ width: state === "done" ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active step banner */}
          <div className="mx-4 mb-4 flex items-center gap-4 px-5 py-4 rounded-2xl bg-purple-500/[0.08] border border-purple-500/20">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <svg className="animate-spin w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{activeStep.label}</p>
              <p className="text-xs text-purple-400/70 mt-0.5">Step {doneCount + 1} of {STEPS.length}</p>
            </div>
            <span className="text-xs text-purple-400 animate-pulse font-medium shrink-0">In progress</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Overall progress</span>
            <span className="text-purple-400 font-semibold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-700 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-600">This usually takes 15–30 seconds</p>
        </div>

      </div>
    </main>
  );
}
