"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = ["Dashboard"];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-8 py-5">
        <Link href="/" className="font-display font-bold text-lg tracking-wider">
          <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
            ASSET EXTRACTOR
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((label) => (
            <Link
              key={label}
              href={label === "Dashboard" ? "/dashboard" : `#${label.toLowerCase()}`}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-300"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Desktop auth buttons */}
          {email ? (
            <>
              <span className="hidden md:block text-sm text-zinc-500 truncate max-w-[180px]">{email}</span>
              <button
                onClick={handleLogout}
                className="hidden md:block text-sm text-zinc-400 hover:text-white transition-colors duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:block text-sm text-zinc-400 hover:text-white transition-colors duration-300"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="hidden md:block text-sm font-semibold px-5 py-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-[0_0_20px_rgba(192,132,252,0.3)] hover:shadow-[0_0_30px_rgba(192,132,252,0.5)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
          >
            <span className={`block h-0.5 w-6 bg-zinc-400 transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-6 bg-zinc-400 transition-all duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-6 bg-zinc-400 transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-dark-950/95 backdrop-blur-xl px-8 py-6 flex flex-col gap-5">
          {NAV_LINKS.map((label) => (
            <Link
              key={label}
              href={label === "Dashboard" ? "/dashboard" : `#${label.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
            {email ? (
              <>
                <span className="text-sm text-zinc-500 truncate">{email}</span>
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white text-center">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
