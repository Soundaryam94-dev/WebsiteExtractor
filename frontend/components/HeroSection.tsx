import UrlInput from "./UrlInput";

const FEATURE_PILLS = ["Images & SVGs", "Color Palette", "Typography", "React SPA", "ZIP Download"];

const STATS = [
  { value: "30s", label: "Avg extraction time" },
  { value: "6+", label: "Asset types" },
  { value: "1-click", label: "ZIP download" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[800px] h-[500px] bg-purple-600/[0.08] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/3 w-[250px] h-[250px] bg-violet-500/[0.06] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[200px] h-[200px] bg-purple-400/[0.04] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8">
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-medium text-purple-300 tracking-widest uppercase">
            AI-Powered Extraction
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight">
          <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
            Extract Any Website
          </span>
          <br />
          <span className="text-white">In Seconds.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Paste a URL and receive a complete design system, all assets, and a
          ready-to-use React SPA — packaged as a ZIP in under 30 seconds.
        </p>

        {/* URL Input */}
        <div className="w-full mt-2">
          <UrlInput />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mt-1">
          {FEATURE_PILLS.map((feature) => (
            <span
              key={feature}
              className="px-3.5 py-1.5 text-xs text-zinc-400 rounded-full bg-white/[0.04] border border-white/[0.07] hover:border-purple-500/30 hover:text-zinc-300 transition-colors duration-200"
            >
              ✓ {feature}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 sm:gap-12 mt-4 pt-8 border-t border-white/[0.06] w-full justify-center">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent">
                {s.value}
              </span>
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
