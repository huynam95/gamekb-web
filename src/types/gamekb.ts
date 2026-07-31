export type Game = {
  id: number;
  title: string;
  cover_url?: string | null;
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
  linked_short_project?: { id: number; title: string } | null;
  linked_long_project?: { id: number; title: string } | null;
};

export type LongVideoCaptureStatus = "to_record" | "recorded" | "retake" | "approved";

export type LongVideoProjectIdea = {
  id?: number;
  project_id?: number;
  detail_id: number;
  position: number;
  capture_status: LongVideoCaptureStatus;
  narration_text?: string | null;
  recording_notes?: string | null;
  file_location?: string | null;
  detail: DetailRow;
};

// Kept for backward compatibility with projects created by the earlier chapter-based studio.
export type LongVideoChapterIdea = {
  id?: number;
  detail_id: number;
  position: number;
  detail: DetailRow;
};

export type LongVideoChapter = {
  id?: number;
  project_id?: number;
  title: string;
  position: number;
  script: string;
  status: "draft" | "ready" | "recorded";
  ideas: LongVideoChapterIdea[];
};

export type LongVideoProject = {
  id: number;
  title: string;
  core_idea?: string | null;
  viewer_promise?: string | null;
  target_duration_minutes: number;
  target_audience?: string | null;
  thumbnail_notes?: string | null;
  thumbnail_url?: string | null;
  status: "planning" | "writing" | "recording" | "editing" | "ready" | "published";
  created_at?: string;
  updated_at?: string;
  project_ideas?: LongVideoProjectIdea[];
  chapters?: Array<{ id: number; script: string; status: string }>;
};
