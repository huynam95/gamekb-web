"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Script = {
  id: number;
  title: string;
  content: string;
  assets: string[];
  created_at: string;
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScripts();
  }, []);

  async function loadScripts() {
    setLoading(true);
    const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
    setScripts((data ?? []) as Script[]);
    setLoading(false);
  }

  async function deleteScript(id: number) {
    if (!confirm("Delete this script?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    loadScripts();
  }

  async function createNew() {
    const name = prompt("Enter script name (e.g., GTA V Shorts #1):");
    if (!name) return;
    await supabase.from("scripts").insert({ title: name, content: "", assets: [] });
    loadScripts();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
             <h1 className="text-3xl font-black text-slate-900">My Scripts</h1>
             <p className="text-slate-500">Manage your video projects</p>
          </div>
          <div className="flex gap-3">
             <Link href="/" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-100">← Back Home</Link>
             <button onClick={createNew} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-slate-800">+ New Project</button>
          </div>
        </header>

        {loading ? <div>Loading...</div> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scripts.map(s => {
               const wordCount = s.content ? s.content.split(/\s+/).length : 0;
               const estSeconds = Math.round(wordCount / 2.5);
               return (
                 <div key={s.id} className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-blue-200">
                    <div>
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-blue-600 truncate pr-4">{s.title}</h3>
                          <button onClick={() => deleteScript(s.id)} className="text-slate-300 hover:text-rose-500">×</button>
                       </div>
                       <div className="flex gap-2 mb-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${estSeconds > 60 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                             ⏱️ {estSeconds}s
                          </span>
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500">
                             🔗 {Array.isArray(s.assets) ? s.assets.length : 0} links
                          </span>
                       </div>
                       <p className="text-sm text-slate-500 line-clamp-3 mb-4 font-mono text-xs bg-slate-50 p-2 rounded border border-slate-100">
                          {s.content || "(Empty script)"}
                       </p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => {navigator.clipboard.writeText(s.content); alert("Copied Text!")}} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold hover:bg-slate-50">Copy Text</button>
                       <button onClick={() => {navigator.clipboard.writeText((s.assets || []).join('\n')); alert("Copied Links!")}} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold hover:bg-slate-50">Copy Links</button>
                    </div>
                 </div>
               )
            })}
          </div>
        )}
      </div>
    </div>
  );
}