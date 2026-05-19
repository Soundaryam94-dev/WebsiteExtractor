import UrlInput from "./UrlInput";

export default function CtaSection() {
  return (
    <section className="relative py-28 px-6 overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[350px] bg-purple-600/[0.07] rounded-full blur-[120px]" />
      </div>

      {/* Gradient border wrapper */}
      <div className="relative z-10 max-w-3xl mx-auto p-px rounded-3xl bg-gradient-to-b from-purple-500/30 via-purple-500/10 to-transparent">
        <div className="rounded-3xl bg-dark-950/90 backdrop-blur-xl px-8 py-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-purple-300 tracking-widest uppercase">
              Free to Try
            </span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to Extract
            <br />
            <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
              Your First Site?
            </span>
          </h2>

          <p className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto">
            Paste any URL below and download a complete design system and React SPA in under 30 seconds.
          </p>

          <UrlInput />

          <div className="flex items-center justify-center gap-6 mt-8">
            {["No account required", "Any public URL", "ZIP delivered instantly"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-zinc-500 text-xs">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
