// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const res = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ password: pass }),
    });

    if (res.ok) {
      router.push("/"); // Chuyển về trang chủ
      router.refresh();
    } else {
      setErr("Incorrect password access denied.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-500">
        
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-500 bg-clip-text text-3xl font-black text-transparent">
            Restricted Area
          </h1>
          <p className="mt-2 text-sm text-slate-400">Enter access code to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition tracking-widest"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {err && (
            <div className="rounded-lg bg-rose-500/20 p-3 text-center text-xs font-bold text-rose-300 border border-rose-500/30">
              ⚠️ {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-white hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 transition active:scale-[0.98]"
          >
            {loading ? "Verifying..." : "Unlock System"}
          </button>
        </form>

        <div className="mt-6 text-center text-[10px] text-slate-600 uppercase tracking-widest">
          GameKB Secure Server
        </div>
      </div>
    </main>
  );
}