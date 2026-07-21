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
