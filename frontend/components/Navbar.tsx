"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-center px-8 py-5">
        <Link href="/" className="font-display font-bold text-lg tracking-wider">
          <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
            WEBSITE EXTRACTOR
          </span>
        </Link>
      </div>
    </nav>
  );
}
