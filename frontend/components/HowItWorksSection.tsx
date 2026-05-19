const STEPS = [
  {
    number: "01",
    title: "Paste a URL",
    description:
      "Drop any public website URL into the input. We support React apps, static sites, and everything in between.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "We Analyze & Extract",
    description:
      "Our headless browser fully renders the page, then extracts images, colors, fonts, and content in parallel.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Download Your ZIP",
    description:
      "Receive a ready-to-use package: a React SPA, design-system.json, content.json, and all assets bundled.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28 px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-purple-400 tracking-widest uppercase px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            How It Works
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-4">
            Three Steps to Done
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-gradient-to-r from-purple-500/20 via-purple-400/50 to-purple-500/20" />

          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-purple-400/20 hover:bg-white/[0.05] transition-all duration-300 group"
            >
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Step bubble */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-dark-950 border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(192,132,252,0.1)] group-hover:shadow-[0_0_40px_rgba(192,132,252,0.2)] group-hover:border-purple-400/50 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors duration-300">
                  {step.icon}
                </div>
                {/* Number badge */}
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  {i + 1}
                </span>
              </div>

              <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
