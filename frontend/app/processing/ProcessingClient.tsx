"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { id: "open",    label: "Opening website"        },
  { id: "images",  label: "Extracting images"       },
  { id: "colors",  label: "Detecting color palette" },
  { id: "fonts",   label: "Analyzing typography"    },
  { id: "content", label: "Extracting content"      },
  { id: "spa",     label: "Generating React SPA"    },
  { id: "zip",     label: "Building ZIP file"       },
];

const ZIP_CONTENTS = [
  { label: "Images/",          sub: "Logo, Hero, Icons, etc." },
  { label: "Colour Palette/",  sub: "palette.json + palette.html" },
  { label: "Typography/",      sub: "typography.json + .html" },
  { label: "Content/",         sub: "content.json + .html" },
  { label: "Design System/",   sub: "index.html + styles.css" },
  { label: "Tech Stack/",      sub: "techstack.json + .html" },
  { label: "README.md",        sub: "Quick start guide" },
];

type StepState  = "pending" | "active" | "done";
type PageStatus = "processing" | "success" | "error";

function BrandHeader({ hostname }: { hostname?: string }) {
  return (
    <div className="text-center flex flex-col gap-3">
      <Link href="/" className="font-display font-bold text-xl tracking-widest inline-block">
        <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
          WEBSITE EXTRACTOR
        </span>
      </Link>
      {hostname && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] w-fit mx-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
          <span className="text-xs text-zinc-400 truncate max-w-[340px] font-medium">{hostname}</span>
        </div>
      )}
    </div>
  );
}

export default function ProcessingClient() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const url          = searchParams.get("url") ?? "";

  const [steps, setSteps] = useState<Record<string, StepState>>(
    Object.fromEntries(STEPS.map((s) => [s.id, "pending"]))
  );
  const [, setActiveIndex] = useState(0);
  const [progress,   setProgress]   = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("processing");
  const [error,      setError]      = useState("");
  const blobUrlRef  = useRef<string | null>(null);
  const apiDoneRef  = useRef(false);
  const stepIndexRef = useRef(0);

  useEffect(() => {
    if (!url) { router.replace("/"); return; }

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

    const controller = new AbortController();

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url }),
      signal:  controller.signal,
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
        a.href = href; a.download = zipName; a.click();
        setPageStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        apiDoneRef.current = true;
        timers.forEach(clearTimeout);
        setError(err instanceof Error ? err.message : "Extraction failed");
        setPageStatus("error");
      });

    return () => { timers.forEach(clearTimeout); controller.abort(); };
  }, [url, router]);

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  // ── Success ──
  if (pageStatus === "success") {
    return (
      <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-7">

          <BrandHeader />

          {/* Status card */}
          <div className="w-full rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">

            {/* Success header */}
            <div className="flex flex-col items-center gap-3 px-7 pt-7 pb-6 border-b border-white/[0.06]">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="font-display text-xl font-bold text-white">Extraction Complete</h1>
                <p className="text-zinc-500 text-xs mt-1">
                  <span className="text-purple-400 font-medium">{hostname}</span> — ZIP is downloading
                </p>
              </div>
            </div>

            {/* ZIP contents */}
            <div className="px-7 py-5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-4">ZIP contains</p>
              <div className="flex flex-col gap-2.5">
                {ZIP_CONTENTS.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-zinc-300">{item.label}</span>
                      <span className="text-xs text-zinc-600 ml-2">{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-7 pb-6">
              {blobUrlRef.current && (
                <a
                  href={blobUrlRef.current}
                  download={(() => { try { return new URL(url).hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "") + ".zip"; } catch { return "website.zip"; } })()}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(192,132,252,0.25)] hover:shadow-[0_4px_28px_rgba(192,132,252,0.45)] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Again
                </a>
              )}
              <Link
                href="/"
                className="flex-1 h-11 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-sm font-medium hover:bg-white/[0.08] transition-all"
              >
                Extract Another
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Error ──
  if (pageStatus === "error") {
    const isBot     = /bot detection|captcha|cloudflare|checking your browser/i.test(error);
    const isAuth    = /401|403|login|auth|access denied|unauthorized/i.test(error);
    const isTimeout = /timeout|timed out|networkidle/i.test(error);
    const isRate    = /too many requests/i.test(error);

    const errorConfig = isBot ? {
      title:    "Site Blocked Our Request",
      summary:  "This website uses bot protection (Cloudflare or reCAPTCHA) that blocks automated access.",
      tip:      "Try a different URL — most public websites work fine.",
      canRetry: false,
    } : isAuth ? {
      title:    "Access Denied",
      summary:  "This page requires a login or is behind a paywall.",
      tip:      "Only publicly accessible pages can be extracted.",
      canRetry: false,
    } : isTimeout ? {
      title:    "Page Took Too Long",
      summary:  "The website didn't finish loading in time.",
      tip:      "The site may be slow or temporarily down. Try again in a moment.",
      canRetry: true,
    } : isRate ? {
      title:    "Too Many Requests",
      summary:  "You've made too many extractions recently.",
      tip:      "Please wait 15 minutes before trying again.",
      canRetry: false,
    } : {
      title:    "Extraction Failed",
      summary:  error,
      tip:      "If this keeps happening, try a different URL.",
      canRetry: true,
    };

    return (
      <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-7">

          <BrandHeader />

          {/* Error card */}
          <div className="w-full rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">

            {/* Error header */}
            <div className="flex flex-col items-center gap-3 px-7 pt-7 pb-6 border-b border-white/[0.06]">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.12)]">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="font-display text-xl font-bold text-white">{errorConfig.title}</h1>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed max-w-[280px]">{errorConfig.summary}</p>
              </div>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-3 px-7 py-5 border-b border-white/[0.06]">
              <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-zinc-400 leading-relaxed">{errorConfig.tip}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-7 py-5">
              {errorConfig.canRetry && (
                <button
                  onClick={() => { setPageStatus("processing"); setError(""); window.location.reload(); }}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-sm hover:shadow-[0_4px_20px_rgba(192,132,252,0.3)] transition-all"
                >
                  Try Again
                </button>
              )}
              <Link
                href="/"
                className={`${errorConfig.canRetry ? "flex-1" : "w-full"} h-11 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-sm font-medium hover:bg-white/[0.08] transition-all`}
              >
                Try a Different URL
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Processing ──
  const activeStep = STEPS.find((s) => steps[s.id] === "active") ?? STEPS[0];
  const doneCount  = STEPS.filter((s) => steps[s.id] === "done").length;

  return (
    <main className="h-screen overflow-hidden bg-dark-950 flex flex-col items-center justify-center px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/[0.06] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-7">

        <BrandHeader hostname={hostname} />

        {/* Card */}
        <div className="rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">

          {/* Stepper — circles only, no redundant labels */}
          <div className="px-7 pt-6 pb-5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium mb-5">Extraction steps</p>
            <div className="flex items-center">
              {STEPS.map((step, i) => {
                const state = steps[step.id];
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    {/* Circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                      state === "done"
                        ? "bg-green-500/10 border border-green-500/25 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                        : state === "active"
                        ? "bg-purple-500/15 border border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.35)]"
                        : "bg-white/[0.03] border border-white/[0.07]"
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
                    {/* Connector */}
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px mx-2 relative overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400/60 to-green-500/30 transition-all duration-700"
                          style={{ width: state === "done" ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-7 h-px bg-white/[0.06]" />

          {/* Active step row */}
          <div className="flex items-center gap-4 px-7 py-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <svg className="animate-spin w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{activeStep.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Step {doneCount + 1} of {STEPS.length}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-400 font-medium">In progress</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Overall progress</span>
            <span className="text-xs text-purple-400 font-bold tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-purple-300 transition-all duration-700"
              style={{ width: `${progress || 2}%` }}
            />
          </div>
          <p className="text-center text-xs text-zinc-600">Usually takes 15–30 seconds</p>
        </div>

      </div>
    </main>
  );
}
