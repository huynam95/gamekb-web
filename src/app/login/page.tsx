// app/login/page.tsx
"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import logoImage from "@/assets/ninjaplay-logo-lg.webp";

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });

    if (res.ok) {
      const nextUrl = new URLSearchParams(window.location.search).get("next") || "/";
      router.push(nextUrl.startsWith("/") ? nextUrl : "/");
      router.refresh();
    } else {
      setErr("Incorrect password access denied.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0b0a1c] p-4">
      {/* Indigo and cyan glow, the colours of the channel avatar. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(96,95,215,0.45),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(46,250,254,0.12),transparent_45%)]" />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src={logoImage}
            alt="NinjaPlay"
            width={112}
            height={112}
            priority
            unoptimized
            className="h-28 w-28 rounded-full shadow-[0_0_0_3px_rgba(46,250,254,0.55),0_0_40px_rgba(96,95,215,0.6)]"
          />
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white">
            Ninja<span className="text-brand-cyan">Play</span>
          </h1>
          <p className="mt-2 text-sm text-[#9a9aba]">Enter your access code to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg font-bold tracking-wider text-white outline-none transition placeholder:text-[#4f4f70] focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan"
            placeholder="••••••••"
            aria-label="Access code"
            autoFocus
          />

          {err && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/20 p-3 text-center text-xs font-bold text-rose-300">
              <ExclamationTriangleIcon className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />{err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#605fd7] to-[#4f4ec0] py-3 text-sm font-bold text-white shadow-lg shadow-[#605fd7]/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>
    </main>
  );
}
