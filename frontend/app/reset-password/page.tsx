"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for error in the URL hash (e.g. expired link)
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.slice(1));
      const desc = params.get("error_description");
      setError(desc?.replace(/\+/g, " ") ?? "Reset link is invalid or has expired.");
      setReady(false);
      return;
    }

    // Supabase puts the access_token in the URL hash — wait for the session to load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <main className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display font-bold text-xl tracking-wider">
            <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
              ASSET EXTRACTOR
            </span>
          </Link>
          <p className="text-zinc-400 text-sm mt-2">Set a new password</p>
        </div>

        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm p-8">
          {done ? (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Password updated!</h2>
                <p className="text-zinc-400 text-sm mt-2">Redirecting you to the homepage…</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
              <p className="text-zinc-400 text-sm">Verifying reset link…</p>
              <p className="text-zinc-600 text-xs">If this takes too long, your link may have expired.<br />
                <Link href="/forgot-password" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Request a new one
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-white mb-6">New password</h1>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 text-sm outline-none focus:border-purple-400 focus:shadow-[0_0_0_1px_#C084FC] transition-all duration-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-zinc-400">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 text-sm outline-none focus:border-purple-400 focus:shadow-[0_0_0_1px_#C084FC] transition-all duration-200"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 mt-2 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-sm tracking-wider shadow-[0_4px_20px_rgba(192,132,252,0.25)] hover:shadow-[0_4px_30px_rgba(192,132,252,0.45)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Updating…
                    </span>
                  ) : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
