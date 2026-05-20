"use client";

import dynamic from "next/dynamic";
import UrlInput from "./UrlInput";

const Prism = dynamic(() => import("./Prism"), { ssr: false });

const FEATURE_PILLS = ["Images & SVGs", "Color Palette", "Typography", "React SPA", "ZIP Download"];

const STATS = [
  { value: "30s", label: "Avg extraction time" },
  { value: "6+", label: "Asset types" },
  { value: "1-click", label: "ZIP download" },
];

export default function HeroSection() {
  return (
    <section className="relative h-screen flex flex-col overflow-hidden">
      {/* Prism background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <Prism
          animationType="rotate"
          timeScale={0.4}
          height={3.5}
          baseWidth={5.5}
          scale={3.8}
          hueShift={0}
          colorFrequency={1}
          noise={0.3}
          glow={1.2}
          bloom={1}
          transparent={true}
          suspendWhenOffscreen={true}
        />
      </div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-dark-950/30 to-dark-950/80 pointer-events-none" />

      {/* Split layout */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row pt-16">

        {/* LEFT — content */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-8 md:py-12 gap-8
                        md:border-r md:border-white/[0.06]">
          {/* Heading */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
              Extract Any
              <br />Website
            </span>
            <br />
            <span className="text-white">In Seconds.</span>
          </h1>

          

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2.5">
            {FEATURE_PILLS.map((f) => (
              <span key={f} className="px-3.5 py-1.5 text-xs text-zinc-400 rounded-full bg-white/[0.04] border border-white/[0.07] hover:border-purple-500/30 hover:text-zinc-300 transition-colors duration-200">
                ✓ {f}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 pt-4 border-t border-white/[0.06]">
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="font-display text-2xl font-bold bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent">
                  {s.value}
                </span>
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — URL input */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 md:px-16 py-16 md:py-24 gap-8">
          <div className="w-full max-w-lg flex flex-col gap-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Start Extracting</h2>
              <p className="text-zinc-500 text-sm">Enter any public website URL below</p>
            </div>

            <UrlInput />

            <div className="flex flex-col gap-3 pt-2">
              {["No account required", "Any public URL works", "ZIP delivered instantly"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
