import type { Page } from "playwright";

// ── Category keys ──────────────────────────────────────────────────────────
export type TechCategory =
  | "fe-framework"   // Frontend → Frameworks & Libraries
  | "fe-ui"          // Frontend → UI Component Libraries
  | "fe-styling"     // Frontend → Styling Tools
  | "fe-state"       // Frontend → State Management
  | "fe-animation"   // Frontend → Animation & 3D
  | "fe-build"       // Frontend → Build Tools
  | "be-language"    // Backend  → Programming Languages
  | "be-runtime"     // Backend  → Runtime Environments
  | "be-framework"   // Backend  → Frameworks
  | "be-server"      // Backend  → Web Servers
  | "cms"            // Platform → CMS / Platform
  | "ecommerce"      // Platform → E-commerce
  | "tagmanager"     // Marketing → Tag Managers
  | "analytics"      // Marketing → Analytics & Tracking
  | "chat"           // Marketing → Chat & Support
  | "hosting";       // Infrastructure → Hosting & CDN

// ── Grouped layout (used by HTML generator) ────────────────────────────────
export const TECH_GROUPS = [
  {
    label: "Frontend Technologies",
    color: "#6366f1",
    categories: [
      { key: "fe-framework" as TechCategory, label: "Frameworks & Libraries" },
      { key: "fe-ui"        as TechCategory, label: "UI Component Libraries" },
      { key: "fe-styling"   as TechCategory, label: "Styling Tools" },
      { key: "fe-state"     as TechCategory, label: "State Management" },
      { key: "fe-animation" as TechCategory, label: "Animation & 3D" },
      { key: "fe-build"     as TechCategory, label: "Build Tools" },
    ],
  },
  {
    label: "Backend Technologies",
    color: "#10b981",
    categories: [
      { key: "be-language"  as TechCategory, label: "Programming Languages" },
      { key: "be-runtime"   as TechCategory, label: "Runtime Environments" },
      { key: "be-framework" as TechCategory, label: "Frameworks" },
      { key: "be-server"    as TechCategory, label: "Web Servers" },
    ],
  },
  {
    label: "Platform & CMS",
    color: "#f97316",
    categories: [
      { key: "cms"          as TechCategory, label: "CMS / Platform" },
      { key: "ecommerce"    as TechCategory, label: "E-commerce" },
    ],
  },
  {
    label: "Analytics & Marketing",
    color: "#a855f7",
    categories: [
      { key: "tagmanager"   as TechCategory, label: "Tag Managers" },
      { key: "analytics"    as TechCategory, label: "Analytics & Tracking" },
      { key: "chat"         as TechCategory, label: "Chat & Support" },
    ],
  },
  {
    label: "Infrastructure",
    color: "#64748b",
    categories: [
      { key: "hosting"      as TechCategory, label: "Hosting & CDN" },
    ],
  },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────
export interface TechStackItem {
  name: string;
  category: TechCategory;
  confidence: "high" | "medium" | "low";
  website?: string;
}

export interface TechStack {
  items: TechStackItem[];
}

// ── Website URLs ───────────────────────────────────────────────────────────
const WEBSITES: Record<string, string> = {
  // Frontend frameworks
  "React": "react.dev", "Next.js": "nextjs.org", "Vue.js": "vuejs.org",
  "Nuxt": "nuxt.com", "Angular": "angular.io", "Svelte": "svelte.dev",
  "Gatsby": "gatsbyjs.com", "Remix": "remix.run", "Astro": "astro.build",
  "SolidJS": "solidjs.com", "Qwik": "qwik.dev",
  // UI libraries
  "Material UI": "mui.com", "Ant Design": "ant.design", "Chakra UI": "chakra-ui.com",
  "Bootstrap": "getbootstrap.com", "Radix UI": "radix-ui.com", "shadcn/ui": "ui.shadcn.com",
  "Headless UI": "headlessui.com", "Mantine": "mantine.dev", "Bulma": "bulma.io",
  "Semantic UI": "semantic-ui.com",
  // Styling
  "Tailwind CSS": "tailwindcss.com", "Styled Components": "styled-components.com",
  "Emotion": "emotion.sh", "CSS Modules": "github.com/css-modules",
  "Sass / SCSS": "sass-lang.com", "Less": "lesscss.org",
  // Common libraries
  "jQuery": "jquery.com", "jQuery UI": "jqueryui.com",
  "Alpine.js": "alpinejs.dev", "htmx": "htmx.org",
  "Lodash": "lodash.com", "Underscore.js": "underscorejs.org", "Moment.js": "momentjs.com",
  "D3.js": "d3js.org", "Chart.js": "chartjs.org", "Highcharts": "highcharts.com",
  "Leaflet": "leafletjs.com",
  "Foundation": "get.foundation",
  // Styling
  "Google Fonts": "fonts.google.com", "Font Awesome": "fontawesome.com",
  "Ionicons": "ionic.io/ionicons", "Animate.css": "animate.style",
  // State management
  "Redux": "redux.js.org", "MobX": "mobx.js.org", "Zustand": "zustand-demo.pmnd.rs",
  "Pinia": "pinia.vuejs.org", "Vuex": "vuex.vuejs.org", "Jotai": "jotai.org",
  "Recoil": "recoiljs.org",
  // Animation & 3D
  "GSAP": "greensock.com", "Three.js": "threejs.org", "Framer Motion": "framer.com/motion",
  "Lottie": "airbnb.io/lottie", "Swiper": "swiperjs.com", "AOS": "michalsnik.github.io/aos",
  "Anime.js": "animejs.com",
  // Build tools
  "Vite": "vitejs.dev", "Webpack": "webpack.js.org", "Parcel": "parceljs.org",
  "esbuild": "esbuild.github.io", "Rollup": "rollupjs.org", "Turbopack": "turbo.build",
  "TypeScript": "typescriptlang.org", "PWA": "web.dev/progressive-web-apps",
  "Workbox": "developer.chrome.com/docs/workbox",
  // Backend languages
  "PHP": "php.net", "Python": "python.org", "Ruby": "ruby-lang.org",
  "Java": "java.com", ".NET / C#": "dotnet.microsoft.com", "Go": "go.dev",
  "Rust": "rust-lang.org",
  // Backend runtimes
  "Node.js": "nodejs.org", "Deno": "deno.land", "Bun": "bun.sh",
  // Backend frameworks
  "Express": "expressjs.com", "Django": "djangoproject.com", "Ruby on Rails": "rubyonrails.org",
  "Laravel": "laravel.com", "Spring Boot": "spring.io", "ASP.NET": "asp.net",
  "FastAPI": "fastapi.tiangolo.com", "Flask": "flask.palletsprojects.com",
  "Symfony": "symfony.com", "CodeIgniter": "codeigniter.com", "Koa": "koajs.com",
  "Fastify": "fastify.io",
  // Web servers
  "Nginx": "nginx.org", "Apache": "apache.org", "Cloudflare": "cloudflare.com",
  "Microsoft IIS": "iis.net", "LiteSpeed": "litespeedtech.com", "Caddy": "caddyserver.com",
  // CMS / Platform
  "WordPress": "wordpress.org", "Ghost": "ghost.org", "Drupal": "drupal.org",
  "Joomla": "joomla.org", "Contentful": "contentful.com", "Sanity": "sanity.io",
  "Strapi": "strapi.io", "Squarespace": "squarespace.com", "Wix": "wix.com",
  "Webflow": "webflow.com", "Framer": "framer.com", "Notion": "notion.so",
  // E-commerce
  "Shopify": "shopify.com", "WooCommerce": "woocommerce.com", "Magento": "magento.com",
  "BigCommerce": "bigcommerce.com", "PrestaShop": "prestashop.com",
  // Tag managers
  "Google Tag Manager": "tagmanager.google.com", "Segment": "segment.com",
  // Analytics
  "Google Analytics": "analytics.google.com", "Facebook Pixel": "business.facebook.com",
  "Hotjar": "hotjar.com", "Mixpanel": "mixpanel.com", "Plausible": "plausible.io",
  "PostHog": "posthog.com", "Amplitude": "amplitude.com", "Microsoft Clarity": "clarity.microsoft.com",
  "Heap": "heap.io", "FullStory": "fullstory.com",
  "Sentry": "sentry.io", "Datadog RUM": "datadoghq.com", "New Relic": "newrelic.com",
  // Chat & Support
  "Intercom": "intercom.com", "Crisp": "crisp.chat", "Drift": "drift.com",
  "Zendesk": "zendesk.com", "HubSpot": "hubspot.com", "Tawk.to": "tawk.to",
  "Freshchat": "freshchat.com", "LiveChat": "livechat.com",
  // Hosting
  "Vercel": "vercel.com", "Netlify": "netlify.com", "GitHub Pages": "pages.github.com",
  "AWS CloudFront": "aws.amazon.com/cloudfront", "Fastly": "fastly.com",
};

// ── Main extractor ─────────────────────────────────────────────────────────
export async function extractTechStack(
  page: Page,
  html: string,
  headers: Record<string, string> = {}
): Promise<TechStack> {
  const items: TechStackItem[] = [];
  const seen = new Set<string>();

  const add = (
    cond: boolean,
    name: string,
    cat: TechCategory,
    conf: "high" | "medium" | "low"
  ) => {
    if (cond && !seen.has(name)) {
      seen.add(name);
      items.push({ name, category: cat, confidence: conf, website: WEBSITES[name] });
    }
  };

  // ── Browser-side detection ───────────────────────────────────────────────
  const d = await page.evaluate(() => {
    const w = window as any;
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => (s as HTMLScriptElement).src.toLowerCase());
    const links = Array.from(document.querySelectorAll("link[href]"))
      .map((l) => (l as HTMLLinkElement).href.toLowerCase());
    const styleContent = Array.from(document.querySelectorAll("style"))
      .map((s) => s.textContent ?? "").join(" ").toLowerCase();
    const metaGen = (
      document.querySelector('meta[name="generator"]')?.getAttribute("content") ?? ""
    ).toLowerCase();
    const has = (list: string[], term: string) => list.some((s) => s.includes(term));
    const hasScript = (term: string) => has(scripts, term);
    const hasLink = (term: string) => has(links, term);

    return {
      // ── Frontend: Frameworks ───────────────────────────────────────────
      next:    !!(w.__NEXT_DATA__ || document.querySelector("#__next")),
      nuxt:    !!(w.__NUXT__ || document.querySelector("#__nuxt")),
      gatsby:  !!(w.___gatsby || document.querySelector("#gatsby-focus-wrapper")),
      remix:   !!(w.__remixContext),
      astro:   !!document.querySelector("astro-island"),
      // React: window.React is stripped in production builds — use fiber inspection instead.
      // React 16+ attaches __reactFiber$<key> to every rendered DOM node.
      react: !!(
        w.React ||
        document.querySelector("[data-reactroot],[data-react-helmet]") ||
        (() => {
          try {
            const candidates = [
              document.getElementById("root"),
              document.getElementById("app"),
              document.getElementById("main"),
              document.getElementById("__next"),
              document.body?.firstElementChild,
            ];
            return candidates.some((el) =>
              el && Object.keys(el).some(
                (k) => k.startsWith("__reactFiber") ||
                       k.startsWith("__reactInternalInstance") ||
                       k.startsWith("__reactEvents")
              )
            );
          } catch { return false; }
        })()
      ),
      // Vue 2 exposes __vue__ on DOM nodes; Vue 3 sets __vue_app__ on mount target
      vue: !!(
        w.__vue_app__ || w.Vue ||
        document.querySelector("[data-v-app]") ||
        (() => {
          try {
            const el = document.getElementById("app") || document.body?.firstElementChild;
            return !!(el && (el as any).__vue__);
          } catch { return false; }
        })()
      ),
      // Angular: ng-version attribute or window.ng
      angular: !!(
        w.ng ||
        document.querySelector("[ng-version]") ||
        document.querySelector("[_nghost-]") ||
        document.querySelector("app-root")
      ),
      // Svelte: adds svelte- prefixed classes to elements
      svelte: !!(
        w.__svelte || hasScript("svelte") ||
        document.querySelector("[class*='svelte-']")
      ),
      solidjs:  !!(w.Solid || hasScript("solid-js")),
      // Common libraries
      jquery:   !!(w.jQuery || (w.$ && w.$.fn && w.$.fn.jquery)),
      alpineJs: !!(w.Alpine),
      htmx:     !!(w.htmx),

      // ── Frontend: UI Libraries ─────────────────────────────────────────
      materialUI: !!document.querySelector(".MuiBox-root,.MuiButton-root,.MuiTypography-root"),
      antDesign:  !!document.querySelector(".ant-btn,.ant-layout,.ant-menu"),
      chakraUI:   !!(w.chakra || document.querySelector("[data-theme][class*='chakra']")),
      // Bootstrap: window global (v5) + DOM data-attributes (v4/v5) + CDN link
      bootstrap:  !!(w.bootstrap?.Modal) ||
                  !!document.querySelector("[data-bs-toggle],[data-bs-target],[data-toggle]") ||
                  hasLink("bootstrap") || hasScript("bootstrap.min.js") || hasScript("bootstrap.bundle"),
      radixUI:    !!document.querySelector("[data-radix-popper-content-wrapper],[data-radix-scroll-area-viewport]"),
      mantine:    !!document.querySelector(".mantine-Button-root,.mantine-Text-root") || hasScript("mantine"),
      bulma:      hasLink("bulma") || hasScript("bulma"),
      semanticUI: hasLink("semantic") || hasScript("semantic.min.js"),

      // ── Frontend: Styling ──────────────────────────────────────────────
      tailwind:         !!(w.tailwind) || hasLink("tailwind") || hasScript("tailwindcss") || hasScript("cdn.tailwindcss.com"),
      tailwindFromStyle: styleContent.includes("tailwindcss") || styleContent.includes("--tw-"),
      styledComponents: !!(w.__SC_ATTR__) || hasScript("styled-components"),
      emotion:          !!(w.__emotion_sheet__) || hasScript("@emotion"),
      sass:             hasLink(".scss") || hasLink(".sass"),
      googleFonts:      hasLink("fonts.googleapis.com"),
      fontAwesome:      hasLink("font-awesome") || hasLink("fontawesome") || hasScript("font-awesome") || hasScript("fontawesome"),
      ionicons:         hasScript("ionicons") || hasLink("ionicons"),

      // ── Data / Visualisation (fe-animation) ───────────────────────────
      d3:          !!(w.d3),
      chartJs:     !!(w.Chart),
      highcharts:  !!(w.Highcharts),
      leaflet:     !!(w.L?.map),
      // Utilities (add to fe-build for now)
      lodash:      !!(w._ && w._.VERSION) || hasScript("lodash"),
      underscore:  !!(w._ && w._.VERSION && !w._.chain) || hasScript("underscore"),
      momentJs:    !!(w.moment) || hasScript("moment.min.js"),

      // ── Frontend: State Management ─────────────────────────────────────
      // Redux: devtools hook not present in prod — check webpackChunk for redux store shape
      redux: !!(
        w.Redux ||
        w.__REDUX_DEVTOOLS_EXTENSION__ ||
        hasScript("redux") ||
        // Redux toolkit bundles as "redux" inside webpack chunks
        (w.webpackChunk && (() => {
          try { return JSON.stringify(w).includes('"getState"'); } catch { return false; }
        })())
      ),
      mobx:    !!(w.mobx) || hasScript("mobx"),
      pinia:   !!(w.__pinia),
      vuex:    !!(w.Vuex) || hasScript("vuex"),
      jotai:   hasScript("jotai"),
      recoil:  !!(w.__recoilKey__) || hasScript("recoil"),
      zustand: hasScript("zustand"),

      // ── Frontend: Animation & 3D ───────────────────────────────────────
      gsap:         !!(w.gsap || w.TweenMax || w.TweenLite),
      threeJs:      !!(w.THREE),
      framerMotion: hasScript("framer-motion"),
      lottie:       !!(w.lottie) || hasScript("lottie"),
      swiper:       !!(w.Swiper) || hasScript("swiper"),
      aos:          !!(w.AOS) || hasScript("aos.js"),
      animeJs:      !!(w.anime) || hasScript("anime.min.js"),

      // ── Frontend: Build Tools ──────────────────────────────────────────
      vite:   !!(w.__vite_plugin_react_preamble_installed__) || hasScript("/@vite/client") || hasScript("@vite/client"),
      // Production Webpack names its global webpackChunk<AppName> (e.g. webpackChunkswiggy).
      // Scan all window keys to catch any variant.
      webpack: !!(
        w.webpackJsonp || w.__webpack_require__ ||
        Object.keys(w).some(k => k.startsWith("webpackChunk") || k === "webpackJsonp")
      ),
      parcel:    hasScript("parcel"),
      turbopack: hasScript("turbopack"),
      // TypeScript: tslib is the TS runtime helper; also check source-map .ts refs
      typescript: hasScript("tslib") || hasLink("tslib") || hasScript(".ts?") ||
                  !!document.querySelector('script[src$=".ts"]'),
      // PWA / Service Worker
      pwa:     !!(w.navigator?.serviceWorker),
      workbox: hasScript("workbox"),

      // ── Platform: CMS ──────────────────────────────────────────────────
      wordpress:    metaGen.includes("wordpress") || hasScript("wp-content") || hasScript("wp-includes"),
      ghost:        metaGen.includes("ghost") || hasScript("ghost.io"),
      drupal:       !!(w.Drupal) || !!document.querySelector("[data-drupal-messages-fallback]"),
      joomla:       metaGen.includes("joomla"),
      contentful:   hasScript("contentful"),
      sanity:       hasScript("sanity.io"),
      strapi:       hasScript("strapi"),
      squarespace:  !!(w.Static?.SQUARESPACE_CONTEXT) || hasScript("squarespace.com"),
      wix:          !!(w.wixBiSession) || hasScript(".wixstatic.com"),
      webflow:      hasScript("webflow.com") || !!document.querySelector("[data-wf-page]"),
      framer:       hasScript("framer.com") || !!document.querySelector("[data-framer-component-type]"),

      // ── Platform: E-commerce ───────────────────────────────────────────
      shopify:      !!(w.Shopify) || hasScript("cdn.shopify.com"),
      woocommerce:  !!(w.woocommerce_params) || !!document.querySelector(".woocommerce"),
      magento:      !!(w.require?.s?.contexts?._?.config?.deps?.includes?.("mage")),
      bigcommerce:  !!(w.BCData) || hasScript("bigcommerce.com"),

      // ── Marketing: Tag Managers ────────────────────────────────────────
      gtm:     !!(w.google_tag_manager) || hasScript("googletagmanager.com"),
      segment: hasScript("cdn.segment.com") || hasScript("cdn.segment.io"),

      // ── Marketing: Analytics ───────────────────────────────────────────
      ga:         !!(w.gtag || w.ga) || hasScript("google-analytics.com"),
      fbPixel:    !!(w.fbq) || hasScript("connect.facebook.net"),
      hotjar:     !!(w.hj) || hasScript("hotjar.com"),
      mixpanel:   !!(w.mixpanel) || hasScript("cdn.mixpanel.com"),
      plausible:  !!(w.plausible) || hasScript("plausible.io"),
      posthog:    !!(w.posthog) || hasScript("posthog.com"),
      amplitude:  !!(w.amplitude) || hasScript("cdn.amplitude.com"),
      clarity:    hasScript("clarity.ms"),
      heap:       !!(w.heap) || hasScript("heapanalytics.com"),
      fullstory:  !!(w.FS) || hasScript("fullstory.com"),
      // Monitoring / Error tracking
      sentry:     !!(w.Sentry) || hasScript("sentry.io") || hasScript("browser.sentry-cdn.com"),
      datadog:    !!(w.DD_RUM) || hasScript("browser-sdk.datadoghq.com"),
      newrelic:   !!(w.newrelic) || hasScript("js-agent.newrelic.com"),

      // ── Marketing: Chat & Support ──────────────────────────────────────
      intercom:    !!(w.Intercom) || hasScript("widget.intercom.io"),
      crisp:       !!(w.$crisp) || hasScript("client.crisp.chat"),
      drift:       !!(w.drift) || hasScript("js.driftt.com"),
      zendesk:     !!(w.zE) || hasScript("static.zdassets.com"),
      hubspotChat: !!(w.HubSpotConversations) || hasScript("js.hs-scripts.com"),
      tawk:        !!(w.Tawk_API) || hasScript("embed.tawk.to"),
      freshchat:   !!(w.fcWidget) || hasScript("snippets.freshchat.com"),
      livechat:    !!(w.__lc) || hasScript("cdn.livechatinc.com"),

      // ── Infrastructure: Hosting ────────────────────────────────────────
      vercel:  hasScript("/_vercel/") || hasLink("/_vercel/"),
      netlify: !!document.querySelector("[data-netlify]") || hasScript("netlify"),
    };
  }).catch(() => null);

  // ── Apply browser detections ─────────────────────────────────────────────
  if (d) {
    // Frameworks — meta-frameworks first (they imply the base library)
    add(d.next,    "Next.js", "fe-framework", "high");
    add(d.nuxt,    "Nuxt",    "fe-framework", "high");
    add(d.gatsby,  "Gatsby",  "fe-framework", "high");
    add(d.remix,   "Remix",   "fe-framework", "high");
    add(d.astro,   "Astro",   "fe-framework", "high");
    add(d.react  && !d.next && !d.gatsby && !d.remix, "React",      "fe-framework", "high");
    add(d.vue    && !d.nuxt,                          "Vue.js",     "fe-framework", "high");
    add(d.angular,                                    "Angular",    "fe-framework", "high");
    add(d.svelte,                                     "Svelte",     "fe-framework", "high");
    add(d.solidjs,                                    "SolidJS",    "fe-framework", "high");
    add(d.jquery,                                     "jQuery",     "fe-framework", "high");
    add(d.alpineJs,                                   "Alpine.js",  "fe-framework", "high");
    add(d.htmx,                                       "htmx",       "fe-framework", "high");

    // UI Libraries
    add(d.materialUI, "Material UI", "fe-ui", "high");
    add(d.antDesign,  "Ant Design",  "fe-ui", "high");
    add(d.chakraUI,   "Chakra UI",   "fe-ui", "high");
    add(d.bootstrap,  "Bootstrap",   "fe-ui", "high");
    add(d.radixUI,    "Radix UI",    "fe-ui", "high");
    add(d.mantine,    "Mantine",     "fe-ui", "high");
    add(d.bulma,      "Bulma",       "fe-ui", "medium");
    add(d.semanticUI, "Semantic UI", "fe-ui", "medium");

    // Styling Tools
    add(d.tailwind || d.tailwindFromStyle, "Tailwind CSS",      "fe-styling", "high");
    add(d.styledComponents,                "Styled Components", "fe-styling", "high");
    add(d.emotion,                         "Emotion",           "fe-styling", "high");
    add(d.sass,                            "Sass / SCSS",       "fe-styling", "medium");
    add(d.googleFonts,                     "Google Fonts",      "fe-styling", "high");
    add(d.fontAwesome,                     "Font Awesome",      "fe-styling", "high");
    add(d.ionicons,                        "Ionicons",          "fe-styling", "high");

    // State Management
    add(d.redux,   "Redux",  "fe-state", "high");
    add(d.mobx,    "MobX",   "fe-state", "high");
    add(d.pinia,   "Pinia",  "fe-state", "high");
    add(d.vuex,    "Vuex",   "fe-state", "high");
    add(d.jotai,   "Jotai",  "fe-state", "medium");
    add(d.recoil,  "Recoil", "fe-state", "medium");
    add(d.zustand, "Zustand","fe-state", "medium");

    // Animation & 3D
    add(d.gsap,         "GSAP",          "fe-animation", "high");
    add(d.threeJs,      "Three.js",      "fe-animation", "high");
    add(d.framerMotion, "Framer Motion", "fe-animation", "high");
    add(d.lottie,       "Lottie",        "fe-animation", "high");
    add(d.swiper,       "Swiper",        "fe-animation", "high");
    add(d.aos,          "AOS",           "fe-animation", "high");
    add(d.animeJs,      "Anime.js",      "fe-animation", "high");
    add(d.d3,           "D3.js",         "fe-animation", "high");
    add(d.chartJs,      "Chart.js",      "fe-animation", "high");
    add(d.highcharts,   "Highcharts",    "fe-animation", "high");
    add(d.leaflet,      "Leaflet",       "fe-animation", "high");

    // Build Tools & Runtimes
    add(d.vite,       "Vite",           "fe-build", "high");
    add(d.webpack,    "Webpack",        "fe-build", "high");
    add(d.parcel,     "Parcel",         "fe-build", "medium");
    add(d.turbopack,  "Turbopack",      "fe-build", "medium");
    add(d.typescript, "TypeScript",     "fe-build", "high");
    add(d.pwa,        "PWA",            "fe-build", "high");
    add(d.workbox,    "Workbox",        "fe-build", "high");
    add(d.lodash,     "Lodash",         "fe-build", "high");
    add(d.underscore, "Underscore.js",  "fe-build", "high");
    add(d.momentJs,   "Moment.js",      "fe-build", "high");

    // Platform: CMS
    add(d.wordpress,   "WordPress",   "cms", "high");
    add(d.ghost,       "Ghost",       "cms", "high");
    add(d.drupal,      "Drupal",      "cms", "high");
    add(d.joomla,      "Joomla",      "cms", "high");
    add(d.contentful,  "Contentful",  "cms", "high");
    add(d.sanity,      "Sanity",      "cms", "high");
    add(d.strapi,      "Strapi",      "cms", "high");
    add(d.squarespace, "Squarespace", "cms", "high");
    add(d.wix,         "Wix",         "cms", "high");
    add(d.webflow,     "Webflow",     "cms", "high");
    add(d.framer,      "Framer",      "cms", "high");

    // Platform: E-commerce
    add(d.shopify,     "Shopify",     "ecommerce", "high");
    add(d.woocommerce, "WooCommerce", "ecommerce", "high");
    add(d.magento,     "Magento",     "ecommerce", "high");
    add(d.bigcommerce, "BigCommerce", "ecommerce", "high");

    // Marketing: Tag Managers
    add(d.gtm,     "Google Tag Manager", "tagmanager", "high");
    add(d.segment, "Segment",            "tagmanager", "high");

    // Marketing: Analytics
    add(d.ga,        "Google Analytics",  "analytics", "high");
    add(d.fbPixel,   "Facebook Pixel",    "analytics", "high");
    add(d.hotjar,    "Hotjar",            "analytics", "high");
    add(d.mixpanel,  "Mixpanel",          "analytics", "high");
    add(d.plausible, "Plausible",         "analytics", "high");
    add(d.posthog,   "PostHog",           "analytics", "high");
    add(d.amplitude, "Amplitude",         "analytics", "high");
    add(d.clarity,   "Microsoft Clarity", "analytics", "high");
    add(d.heap,      "Heap",              "analytics", "high");
    add(d.fullstory, "FullStory",         "analytics", "high");
    add(d.sentry,    "Sentry",            "analytics", "high");
    add(d.datadog,   "Datadog RUM",       "analytics", "high");
    add(d.newrelic,  "New Relic",         "analytics", "high");

    // Marketing: Chat & Support
    add(d.intercom,    "Intercom",  "chat", "high");
    add(d.crisp,       "Crisp",     "chat", "high");
    add(d.drift,       "Drift",     "chat", "high");
    add(d.zendesk,     "Zendesk",   "chat", "high");
    add(d.hubspotChat, "HubSpot",   "chat", "high");
    add(d.tawk,        "Tawk.to",   "chat", "high");
    add(d.freshchat,   "Freshchat", "chat", "high");
    add(d.livechat,    "LiveChat",  "chat", "high");

    // Infrastructure: Hosting (DOM-level fallback — headers are more reliable, done below)
    add(d.vercel,  "Vercel",  "hosting", "medium");
    add(d.netlify, "Netlify", "hosting", "medium");
  }

  // ── Response header detection (backend stack) ─────────────────────────────
  const server    = (headers["server"]       ?? "").toLowerCase();
  const powered   = (headers["x-powered-by"] ?? "").toLowerCase();
  const setCookie = (headers["set-cookie"]   ?? "").toLowerCase();
  const generator = (headers["x-generator"] ?? "").toLowerCase();

  // ── Hosting / CDN (from headers — most reliable) ──────────────────────────
  add(!!headers["x-vercel-id"] || !!headers["x-vercel-cache"] ||
      server.includes("vercel"),                             "Vercel",        "hosting", "high");
  add(!!headers["x-netlify-id"] || server.includes("netlify"),"Netlify",     "hosting", "high");
  add(server.includes("cloudflare") || !!headers["cf-ray"], "Cloudflare",    "hosting", "high");
  add(!!headers["x-amz-cf-id"] || !!headers["x-amz-request-id"],
                                                             "AWS CloudFront","hosting", "high");
  add(!!headers["x-fastly-request-id"],                      "Fastly",        "hosting", "high");

  // ── Web Servers ────────────────────────────────────────────────────────────
  add(server.includes("nginx"),          "Nginx",         "be-server", "high");
  add(server.includes("apache"),         "Apache",        "be-server", "high");
  add(server.includes("microsoft-iis"),  "Microsoft IIS", "be-server", "high");
  add(server.includes("litespeed"),      "LiteSpeed",     "be-server", "high");
  add(server.includes("caddy"),          "Caddy",         "be-server", "high");

  // ── Backend Frameworks (from headers) ────────────────────────────────────
  const isExpress   = powered.includes("express");
  const isNextSsr   = powered.includes("next.js");          // Vercel sets x-powered-by: Next.js
  const isDjango    = setCookie.includes("csrftoken") && !setCookie.includes("wordpress");
  const isRails     = setCookie.includes("_rails_session") || powered.includes("rack");
  const isLaravel   = setCookie.includes("laravel_session");
  const isSpring    = !!headers["x-application-context"];
  const isAspNet    = powered.includes("asp.net") || !!headers["x-aspnet-version"];
  const isPhp       = powered.includes("php") || setCookie.includes("phpsessid");
  const isJava      = setCookie.includes("jsessionid") || isSpring;

  add(isExpress, "Express",       "be-framework", "high");
  add(isDjango,  "Django",        "be-framework", "high");
  add(isRails,   "Ruby on Rails", "be-framework", "high");
  add(isLaravel, "Laravel",       "be-framework", "high");
  add(isSpring,  "Spring Boot",   "be-framework", "high");
  add(isAspNet,  "ASP.NET",       "be-framework", "high");

  // ── Runtime Environments ──────────────────────────────────────────────────
  // Node.js: detected directly from headers OR inferred from Node-based frameworks
  const nodeFrameworks = ["Next.js", "Nuxt", "Remix", "Gatsby", "Astro"] as const;
  const hasNodeFramework = nodeFrameworks.some((f) => seen.has(f));
  add(
    isExpress || isNextSsr || powered.includes("node") || hasNodeFramework,
    "Node.js", "be-runtime", "high"
  );

  // ── Programming Languages (inferred from framework/server signals) ─────────
  add(isPhp || generator.includes("drupal"),      "PHP",        "be-language", "high");
  add(isDjango || powered.includes("python"),     "Python",     "be-language", "high");
  add(isRails,                                    "Ruby",       "be-language", "high");
  add(isJava || isSpring,                         "Java",       "be-language", "high");
  add(isAspNet,                                   ".NET / C#",  "be-language", "high");
  // JavaScript is the language when Node.js is the runtime
  add(
    isExpress || isNextSsr || powered.includes("node") || hasNodeFramework,
    "JavaScript", "be-language", "high"
  );

  // ── HTML source scanning ─────────────────────────────────────────────────
  // Extract every script src and link href from raw HTML with regex.
  // This catches self-hosted libraries (e.g. /js/jquery.min.js) that never hit a CDN URL.
  const allRefs = [
    ...[...html.matchAll(/(?:src|data-src)=["']([^"']+)["']/gi)].map((m) => m[1].toLowerCase()),
    ...[...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].toLowerCase()),
  ];
  const inRef = (term: string) => allRefs.some((r) => r.includes(term));
  const hl = html.toLowerCase();

  // ── Frontend Frameworks ───────────────────────────────────────────────────
  add(hl.includes("__next_data__"),                                     "Next.js",   "fe-framework", "medium");
  add(hl.includes("__nuxt"),                                            "Nuxt",      "fe-framework", "medium");
  add(hl.includes("___gatsby"),                                         "Gatsby",    "fe-framework", "medium");
  // React — bundled builds reference react-dom in script filenames or inline chunks
  add(
    inRef("react-dom") || inRef("react.production") || inRef("react.development") ||
    hl.includes("_reactfiber") || hl.includes("__reactinternalinstance"),
    "React", "fe-framework", "medium"
  );
  // Vue — bundled builds often include vue in chunk filenames
  add(inRef("vue.runtime") || inRef("vue.min.js") || inRef("vue.esm"), "Vue.js", "fe-framework", "medium");
  // jQuery — any script src containing "jquery"
  add(inRef("jquery"),                                                  "jQuery",    "fe-framework", "medium");
  // Alpine.js
  add(inRef("alpine.js") || inRef("alpinejs"),                          "Alpine.js", "fe-framework", "medium");
  // htmx
  add(inRef("htmx"),                                                    "htmx",      "fe-framework", "medium");

  // ── UI Libraries ──────────────────────────────────────────────────────────
  add(inRef("bootstrap.min.css") || inRef("bootstrap.css") ||
      inRef("bootstrap.min.js")  || inRef("bootstrap.bundle"), "Bootstrap",   "fe-ui", "medium");
  add(inRef("jquery-ui") || inRef("jquery.ui"),                "jQuery UI",   "fe-ui", "medium");
  add(inRef("bulma"),                                          "Bulma",       "fe-ui", "medium");
  add(inRef("semantic.min.css") || inRef("semantic.css") ||
      inRef("semantic.min.js"),                                "Semantic UI", "fe-ui", "medium");
  add(inRef("foundation") && (inRef(".css") || inRef(".js")),  "Foundation",  "fe-ui", "medium");

  // ── Styling Tools ─────────────────────────────────────────────────────────
  add(hl.includes("fonts.googleapis.com") || hl.includes("fonts.gstatic.com"),
      "Google Fonts", "fe-styling", "medium");
  // Font Awesome — link/script src OR class usage (fa fa-*, fas fa-*, far fa-*)
  add(inRef("font-awesome") || inRef("fontawesome") ||
      hl.includes('"fa fa-') || hl.includes("'fa fa-") ||
      hl.includes('"fas fa-') || hl.includes('"far fa-') ||
      hl.includes('"fab fa-') || hl.includes('"fal fa-'),
      "Font Awesome", "fe-styling", "medium");
  add(inRef("ionicons"),
      "Ionicons", "fe-styling", "medium");
  add(hl.includes("cdn.tailwindcss.com") || hl.includes("tailwindcss") || hl.includes("--tw-ring"),
      "Tailwind CSS", "fe-styling", "medium");
  add(inRef("animate.css"),
      "Animate.css", "fe-styling", "medium");

  // ── Animation & Data Viz ──────────────────────────────────────────────────
  add(inRef("gsap.min.js") || inRef("gsap.js") || inRef("tweenmax") || inRef("tweenlite"),
      "GSAP", "fe-animation", "medium");
  add(inRef("three.min.js") || inRef("three.js") || inRef("/three@"),
      "Three.js", "fe-animation", "medium");
  add(inRef("chart.min.js") || inRef("chart.js") || inRef("chartjs") || inRef("/chart@"),
      "Chart.js", "fe-animation", "medium");
  add(inRef("d3.min.js") || inRef("d3.js") || inRef("/d3@") || inRef("d3.v"),
      "D3.js", "fe-animation", "medium");
  add(inRef("highcharts"),
      "Highcharts", "fe-animation", "medium");
  add(inRef("swiper.min.js") || inRef("swiper.js") || inRef("swiper-bundle"),
      "Swiper", "fe-animation", "medium");
  add(inRef("aos.js") || inRef("aos.min.js"),
      "AOS", "fe-animation", "medium");
  add(inRef("lottie") && (inRef(".js") || inRef(".min")),
      "Lottie", "fe-animation", "medium");
  add(inRef("leaflet.js") || inRef("leaflet.min.js"),
      "Leaflet", "fe-animation", "medium");

  // ── Build / Utilities ─────────────────────────────────────────────────────
  // Webpack: production apps name their global webpackChunk<AppName> — catch it in HTML
  add(
    /webpackChunk[A-Za-z_$]/.test(html) || hl.includes("__webpack_require__") || hl.includes("webpackjsonp"),
    "Webpack", "fe-build", "medium"
  );
  // TypeScript: tslib runtime helper, or .ts source map references
  add(
    inRef("tslib") || hl.includes("tslib") || hl.includes("__awaiter") || hl.includes("__generator"),
    "TypeScript", "fe-build", "medium"
  );
  // PWA
  add(hl.includes("serviceworker") || inRef("sw.js") || inRef("service-worker"), "PWA", "fe-build", "medium");
  add(inRef("workbox"),                                          "Workbox",       "fe-build", "medium");
  add(inRef("lodash"),                                           "Lodash",        "fe-build", "medium");
  add(inRef("underscore.js") || inRef("underscore.min.js"),     "Underscore.js", "fe-build", "medium");
  add(inRef("moment.min.js") || inRef("moment.js") || inRef("/moment@"), "Moment.js", "fe-build", "medium");

  // ── Platform: CMS ─────────────────────────────────────────────────────────
  add(hl.includes("wp-content") || hl.includes("wp-includes"), "WordPress",  "cms", "medium");
  add(hl.includes("cdn.shopify.com"),                          "Shopify",    "ecommerce", "medium");

  // ── Backend Language hint from URL patterns ────────────────────────────────
  // If .php appears in form actions or XHR endpoint URLs it strongly suggests PHP
  add(
    !seen.has("PHP") && (
      /action=["'][^"']+\.php["']/i.test(html) ||
      /["'][^"']+\.php(\?[^"']*)?["']/i.test(html)
    ),
    "PHP", "be-language", "medium"
  );

  // ── Marketing ─────────────────────────────────────────────────────────────
  add(hl.includes("googletagmanager.com"),                           "Google Tag Manager", "tagmanager", "medium");
  add(hl.includes("google-analytics.com") || hl.includes("gtag("),  "Google Analytics",   "analytics",  "medium");
  add(hl.includes("connect.facebook.net") || hl.includes("fbq("),   "Facebook Pixel",     "analytics",  "medium");
  add(hl.includes("hotjar.com"),                                     "Hotjar",             "analytics",  "medium");
  add(hl.includes("plausible.io"),                                   "Plausible",          "analytics",  "medium");
  add(hl.includes("clarity.ms"),                                     "Microsoft Clarity",  "analytics",  "medium");
  add(hl.includes("widget.intercom.io"),                             "Intercom",           "chat",       "medium");
  add(hl.includes("embed.tawk.to"),                                  "Tawk.to",            "chat",       "medium");
  add(hl.includes("client.crisp.chat"),                              "Crisp",              "chat",       "medium");
  // Monitoring
  add(inRef("sentry") || hl.includes("sentry.io"),                   "Sentry",             "analytics",  "medium");
  add(inRef("datadoghq") || inRef("datadog"),                        "Datadog RUM",        "analytics",  "medium");
  add(inRef("newrelic") || inRef("nr-data"),                         "New Relic",          "analytics",  "medium");

  return { items };
}
