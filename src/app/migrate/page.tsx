"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 1. Hàm lấy title (dùng lại logic cũ)
async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(url)) return null;

    const res = await fetch(`https://noembed.com/embed?url=${url}`);
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

export default function MigratePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  async function runMigration() {
    setIsRunning(true);
    setLogs((prev) => ["🚀 Starting migration...", ...prev]);

    // 1. Lấy tất cả footage chưa có title
    const { data: footages, error } = await supabase
      .from("footage")
      .select("id, file_path")
      .is("title", null); // Chỉ lấy dòng nào title đang NULL

    if (error) {
      setLogs((prev) => [`❌ Error fetching data: ${error.message}`, ...prev]);
      setIsRunning(false);
      return;
    }

    if (!footages || footages.length === 0) {
      setLogs((prev) => ["✅ No footage needs update.", ...prev]);
      setIsRunning(false);
      return;
    }

    setLogs((prev) => [`Found ${footages.length} items to update...`, ...prev]);
    let successCount = 0;

    // 2. Chạy vòng lặp xử lý từng cái
    for (let i = 0; i < footages.length; i++) {
      const item = footages[i];
      const link = item.file_path || "";
      
      // Cập nhật thanh tiến trình
      setProgress(Math.round(((i + 1) / footages.length) * 100));

      // Lấy tên từ Youtube
      const ytTitle = await fetchYoutubeTitle(link);

      // Nếu lấy được tên (hoặc nếu không phải link youtube thì dùng chính link làm tên tạm)
      const newTitle = ytTitle || link; 

      // Update ngược lại vào DB
      const { error: updateErr } = await supabase
        .from("footage")
        .update({ 
            title: newTitle,
            // Logic phụ: Nếu là link youtube thì coi như chưa download, 
            // nếu là đường dẫn file cục bộ (ko chứa http) thì coi như đã download
            downloaded: !link.startsWith("http") 
        })
        .eq("id", item.id);

      if (updateErr) {
        setLogs((prev) => [`❌ Failed ID ${item.id}: ${updateErr.message}`, ...prev]);
      } else {
        setLogs((prev) => [`✅ Updated ID ${item.id}: ${newTitle}`, ...prev]);
        successCount++;
      }

      // Delay nhẹ 1 xíu để tránh spam API quá nhanh (tùy chọn)
      await new Promise(r => setTimeout(r, 200));
    }

    setLogs((prev) => [`🎉 DONE! Updated ${successCount}/${footages.length} items.`, ...prev]);
    setIsRunning(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          🛠 Data Migration Tool
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Công cụ này sẽ quét toàn bộ Footage chưa có tên (title is null), tự động lấy tên từ Youtube và cập nhật vào CSDL.
        </p>

        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold mb-1">
             <span>Progress</span>
             <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div 
                className="h-2 rounded-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        <button
          onClick={runMigration}
          disabled={isRunning}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isRunning ? "Running..." : "Start Update"}
        </button>

        <div className="mt-6 h-64 overflow-auto rounded-xl border border-slate-100 bg-slate-900 p-4 font-mono text-xs text-green-400">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">
              {log}
            </div>
          ))}
          {logs.length === 0 && <span className="text-slate-500">Waiting to start...</span>}
        </div>
      </div>
    </div>
  );
}