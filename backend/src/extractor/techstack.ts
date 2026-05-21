import type { Page } from "playwright";

export type TechCategory =
  | "framework"
  | "cms"
  | "ecommerce"
  | "analytics"
  | "chat"
  | "ui"
  | "tagmanager"
  | "hosting";

export interface TechStackItem {
  name: string;
  category: TechCategory;
  confidence: "high" | "medium" | "low";
  website?: string;
}

export interface TechStack {
  items: TechStackItem[];
}

const WEBSITES: Record<string, string> = {
  "Next.js": "nextjs.org", "Nuxt": "nuxt.com", "Gatsby": "gatsbyjs.com",
  "Remix": "remix.run", "Astro": "astro.build", "React": "react.dev",
  "Vue.js": "vuejs.org", "Angular": "angular.io", "Svelte": "svelte.dev",
  "WordPress": "wordpress.org", "Ghost": "ghost.org", "Squarespace": "squarespace.com",
  "Wix": "wix.com", "Webflow": "webflow.com", "Drupal": "drupal.org",
  "Joomla": "joomla.org", "Framer": "framer.com",
  "Shopify": "shopify.com", "WooCommerce": "woocommerce.com",
  "Google Tag Manager": "tagmanager.google.com",
  "Google Analytics": "analytics.google.com", "Facebook Pixel": "business.facebook.com",
  "Hotjar": "hotjar.com", "Mixpanel": "mixpanel.com", "Segment": "segment.com",
  "Plausible": "plausible.io", "PostHog": "posthog.com", "Amplitude": "amplitude.com",
  "Microsoft Clarity": "clarity.microsoft.com",
  "Intercom": "intercom.com", "Crisp": "crisp.chat", "Drift": "drift.com",
  "Zendesk": "zendesk.com", "HubSpot": "hubspot.com", "Tawk.to": "tawk.to",
  "Freshchat": "freshchat.com",
  "Bootstrap": "getbootstrap.com", "Material UI": "mui.com", "Ant Design": "ant.design",
  "Tailwind CSS": "tailwindcss.com",
  "Vercel": "vercel.com", "Netlify": "netlify.com",
};

export async function extractTechStack(page: Page, html: string): Promise<TechStack> {
  const items: TechStackItem[] = [];

  const d = await page.evaluate(() => {
    const w = window as any;
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => (s as HTMLScriptElement).src.toLowerCase());
    const links = Array.from(document.querySelectorAll("link[href]"))
      .map((l) => (l as HTMLLinkElement).href.toLowerCase());
    const metaGen = (
      document.querySelector('meta[name="generator"]')?.getAttribute("content") ?? ""
    ).toLowerCase();
    const has = (list: string[], term: string) => list.some((s) => s.includes(term));

    return {
      // Meta-frameworks (detected before base libraries)
      next:         !!(w.__NEXT_DATA__ || document.querySelector("#__next")),
      nuxt:         !!(w.__NUXT__ || document.querySelector("#__nuxt")),
      gatsby:       !!(w.___gatsby || document.querySelector("#gatsby-focus-wrapper")),
      remix:        !!(w.__remixContext),
      astro:        !!document.querySelector("astro-island"),
      // Base libraries
      react:        !!(w.React || document.querySelector("[data-reactroot],[data-react-helmet]")),
      vue:          !!(w.__vue_app__ || w.Vue || document.querySelector("[data-v-app]")),
      angular:      !!(w.ng || document.querySelector("[ng-version]")),
      svelte:       !!(w.__svelte),
      // CMS / Platforms
      wordpress:    metaGen.includes("wordpress") || has(scripts, "wp-content") || has(scripts, "wp-includes"),
      ghost:        metaGen.includes("ghost") || has(scripts, "ghost.io"),
      squarespace:  !!(w.Static?.SQUARESPACE_CONTEXT) || has(scripts, "squarespace.com"),
      wix:          !!(w.wixBiSession) || has(scripts, ".wixstatic.com"),
      webflow:      has(scripts, "webflow.com") || !!document.querySelector("[data-wf-page]"),
      drupal:       !!(w.Drupal) || !!document.querySelector("[data-drupal-messages-fallback]"),
      joomla:       metaGen.includes("joomla"),
      framer:       has(scripts, "framer.com") || !!document.querySelector("[data-framer-component-type]"),
      // E-commerce
      shopify:      !!(w.Shopify) || has(scripts, "cdn.shopify.com"),
      woocommerce:  !!(w.woocommerce_params) || !!document.querySelector(".woocommerce"),
      // Tag Manager
      gtm:          !!(w.google_tag_manager) || has(scripts, "googletagmanager.com"),
      // Analytics
      ga:           !!(w.gtag || w.ga) || has(scripts, "google-analytics.com"),
      fbPixel:      !!(w.fbq) || has(scripts, "connect.facebook.net"),
      hotjar:       !!(w.hj) || has(scripts, "hotjar.com"),
      mixpanel:     !!(w.mixpanel) || has(scripts, "cdn.mixpanel.com"),
      segment:      has(scripts, "cdn.segment.com") || has(scripts, "cdn.segment.io"),
      plausible:    !!(w.plausible) || has(scripts, "plausible.io"),
      posthog:      !!(w.posthog) || has(scripts, "posthog.com"),
      amplitude:    !!(w.amplitude) || has(scripts, "cdn.amplitude.com"),
      clarity:      has(scripts, "clarity.ms"),
      // Chat
      intercom:     !!(w.Intercom) || has(scripts, "widget.intercom.io"),
      crisp:        !!(w.$crisp) || has(scripts, "client.crisp.chat"),
      drift:        !!(w.drift) || has(scripts, "js.driftt.com"),
      zendesk:      !!(w.zE) || has(scripts, "static.zdassets.com"),
      hubspotChat:  !!(w.HubSpotConversations) || has(scripts, "js.hs-scripts.com"),
      tawk:         !!(w.Tawk_API) || has(scripts, "embed.tawk.to"),
      freshchat:    !!(w.fcWidget) || has(scripts, "snippets.freshchat.com"),
      // UI Libraries
      bootstrap:    has(links, "bootstrap") || has(scripts, "bootstrap.min.js"),
      materialUI:   !!document.querySelector(".MuiBox-root,.MuiButton-root"),
      antDesign:    !!document.querySelector(".ant-btn,.ant-layout"),
      // Hosting
      vercel:       has(scripts, "_vercel") || has(links, "_vercel"),
      netlify:      !!document.querySelector("[data-netlify]") || has(scripts, "netlify"),
    };
  }).catch(() => null);

  const add = (
    cond: boolean,
    name: string,
    cat: TechCategory,
    conf: "high" | "medium" | "low"
  ) => {
    if (cond && !items.some((i) => i.name === name)) {
      items.push({ name, category: cat, confidence: conf, website: WEBSITES[name] });
    }
  };

  if (d) {
    // Frameworks — meta-frameworks first, then base libraries
    add(d.next,    "Next.js", "framework", "high");
    add(d.nuxt,    "Nuxt",    "framework", "high");
    add(d.gatsby,  "Gatsby",  "framework", "high");
    add(d.remix,   "Remix",   "framework", "high");
    add(d.astro,   "Astro",   "framework", "high");
    // Only add base library if no meta-framework already covers it
    add(d.react && !d.next && !d.gatsby && !d.remix, "React",   "framework", "high");
    add(d.vue   && !d.nuxt,                          "Vue.js",  "framework", "high");
    add(d.angular,                                   "Angular", "framework", "high");
    add(d.svelte,                                    "Svelte",  "framework", "medium");

    // CMS
    add(d.wordpress,  "WordPress",   "cms", "high");
    add(d.ghost,      "Ghost",       "cms", "high");
    add(d.squarespace,"Squarespace", "cms", "high");
    add(d.wix,        "Wix",         "cms", "high");
    add(d.webflow,    "Webflow",     "cms", "high");
    add(d.drupal,     "Drupal",      "cms", "high");
    add(d.joomla,     "Joomla",      "cms", "high");
    add(d.framer,     "Framer",      "cms", "high");

    // E-commerce
    add(d.shopify,    "Shopify",     "ecommerce", "high");
    add(d.woocommerce,"WooCommerce", "ecommerce", "high");

    // Tag Manager
    add(d.gtm, "Google Tag Manager", "tagmanager", "high");

    // Analytics
    add(d.ga,       "Google Analytics",  "analytics", "high");
    add(d.fbPixel,  "Facebook Pixel",    "analytics", "high");
    add(d.hotjar,   "Hotjar",            "analytics", "high");
    add(d.mixpanel, "Mixpanel",          "analytics", "high");
    add(d.segment,  "Segment",           "analytics", "high");
    add(d.plausible,"Plausible",         "analytics", "high");
    add(d.posthog,  "PostHog",           "analytics", "high");
    add(d.amplitude,"Amplitude",         "analytics", "high");
    add(d.clarity,  "Microsoft Clarity", "analytics", "high");

    // Chat
    add(d.intercom,   "Intercom",  "chat", "high");
    add(d.crisp,      "Crisp",     "chat", "high");
    add(d.drift,      "Drift",     "chat", "high");
    add(d.zendesk,    "Zendesk",   "chat", "high");
    add(d.hubspotChat,"HubSpot",   "chat", "high");
    add(d.tawk,       "Tawk.to",   "chat", "high");
    add(d.freshchat,  "Freshchat", "chat", "high");

    // UI Libraries
    add(d.bootstrap, "Bootstrap",   "ui", "medium");
    add(d.materialUI,"Material UI", "ui", "high");
    add(d.antDesign, "Ant Design",  "ui", "high");

    // Hosting
    add(d.vercel,  "Vercel",  "hosting", "medium");
    add(d.netlify, "Netlify", "hosting", "medium");
  }

  // HTML source fallbacks
  const h = html.toLowerCase();
  add(h.includes("wp-content") || h.includes("wp-includes"), "WordPress", "cms", "medium");
  add(h.includes("__next_data__"),                            "Next.js",   "framework", "medium");
  add(h.includes("cdn.shopify.com"),                         "Shopify",   "ecommerce", "medium");
  add(h.includes("googletagmanager.com"),                    "Google Tag Manager", "tagmanager", "medium");
  add(h.includes("google-analytics.com") || h.includes("gtag("), "Google Analytics", "analytics", "medium");

  return { items };
}
