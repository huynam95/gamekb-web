"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VIDEO_TOPICS_TABLE, rowToVideoTheme, type VideoTheme, type VideoThemeRow } from "@/lib/videoThemes";

export function useProjectTopics(enabled = true) {
  const [topics, setTopics] = useState<VideoTheme[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError("");
    async function load() {
      try {
        const { data, error: queryError } = await supabase.from(VIDEO_TOPICS_TABLE).select("id,title,hook").order("sort_order").order("created_at");
        if (queryError) throw queryError;
        if (active) setTopics(((data ?? []) as VideoThemeRow[]).map(rowToVideoTheme));
      } catch {
        if (active) setError("Could not load topics. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [enabled, revision]);

  return { topics, loading, error, retry: () => setRevision((current) => current + 1) };
}
