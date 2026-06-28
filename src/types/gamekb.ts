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
  file_path: string;
  title: string | null;
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
};

export type ScriptProject = {
  id: number;
  title: string;
  content: string;
  assets: { url: string; name: string }[];
  description: string;
  hashtags: string[];
  tags: string[];
  publish_date: string | null;
  status: string;
};
