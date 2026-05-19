const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Image Extraction",
    description: "Captures every image, SVG, icon, and background asset from the target page.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    title: "Color Palette",
    description: "Detects primary, secondary, and accent colors from computed styles across the page.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
    title: "Typography",
    description: "Extracts font families, sizes, and weights used for headings and body text.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Content Extraction",
    description: "Pulls headings, paragraphs, buttons, nav links, and footer text into clean JSON.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "React SPA Generator",
    description: "Generates a ready-to-run React page using extracted styles, fonts, and content.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: "ZIP Download",
    description: "Everything bundled into a single ZIP — assets, JSON files, and the SPA in one click.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6">
      {/* Top glow divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-purple-400 tracking-widest uppercase px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            What You Get
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-4">
            Everything in One Extract
          </h2>
          <p className="text-zinc-400 text-lg mt-4 max-w-xl mx-auto">
            One URL. Six outputs. No manual copying, no browser devtools, no guesswork.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-purple-400/25 hover:shadow-[0_0_40px_rgba(192,132,252,0.07)] transition-all duration-300 overflow-hidden"
            >
              {/* Gradient top accent on hover */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Number badge */}
              <span className="absolute top-4 right-4 text-[11px] font-bold text-purple-500/40 font-display">
                0{i + 1}
              </span>

              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400 mb-5 group-hover:bg-purple-500/20 group-hover:border-purple-400/30 transition-all duration-300">
                {f.icon}
              </div>

              <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
