export type Game = {
  id: number;
  title: string;
  cover_url?: string | null;
  release_year?: number | null;
  /** Studio / label, e.g. "Rockstar Games" (see src/lib/studios.ts). */
  studio?: string | null;
};

export type Group = {
  id: number;
  name: string;
};

export type FootageItem = {
  id?: number;
  file_path: string;
  title: string | null;
  channel_name?: string | null;
  downloaded?: boolean | null;
};

export type DetailRow = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  game_id: number;
  pinned?: boolean;
  created_at?: string;
  status?: string;
  /** Recording List (see src/lib/recording.ts). */
  capture_status?: "to_record" | "recorded" | "used" | null;
  capture_notes?: string | null;
  capture_priority?: number | null;
  capture_added_at?: string | null;
  recorded_at?: string | null;
  game?: Game;
  footage?: FootageItem[];
  groups?: Group[];
};

export type ScriptAsset = {
  url: string;
  name: string;
  channel_name?: string | null;
  idea_id?: number | null;
  idea_title?: string | null;
  game_title?: string | null;
  idea_order?: number | null;
};

export type ScriptProject = {
  id: number;
  title: string;
  topic?: string | null;
  content: string;
  assets: ScriptAsset[];
  description: string;
  hashtags: string[];
  tags: string[];
  publish_date: string | null;
  status: string;
};


export type AudienceRequest = {
  id: number;
  comment_text: string;
  commenter_name?: string | null;
  source_url?: string | null;
  game_id?: number | null;
  notes?: string | null;
  content_type: "short" | "long" | "undecided";
  status: "inbox" | "planned" | "in_progress" | "published" | "replied";
  promised: boolean;
  published_url?: string | null;
  linked_idea_id?: number | null;
  linked_short_project_id?: number | null;
  linked_long_project_id?: number | null;
  created_at?: string;
  game?: Game | null;
  linked_idea?: { id: number; title: string } | null;
  linked_short_project?: { id: number; title: string; status?: string | null } | null;
  linked_long_project?: { id: number; title: string } | null;
};

