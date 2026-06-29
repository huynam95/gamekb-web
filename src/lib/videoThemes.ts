export type VideoTheme = {
  id: string;
  title: string;
  hook: string;
};

export type VideoThemeRow = {
  id: string;
  title: string;
  hook: string | null;
  sort_order?: number | null;
};

export const VIDEO_TOPICS_TABLE = "video_topics";

export const VIDEO_THEMES_STORAGE_KEY = "gamekb-video-themes";
export const ACTIVE_VIDEO_THEME_STORAGE_KEY = "gamekb-active-video-theme";

export const DEFAULT_VIDEO_THEMES: VideoTheme[] = [
  {
    id: "troll-other-games",
    title: "Games That Troll Other Games",
    hook: "Did you know some games secretly make fun of other games?",
  },
  {
    id: "troll-you",
    title: "Games That Troll You",
    hook: "Did you know some games are built to mess with the player?",
  },
  {
    id: "remember-you",
    title: "Games That Remember You",
    hook: "Did you know some games actually remember what you did?",
  },
  {
    id: "punish-you",
    title: "Games That Punish You For…",
    hook: "Did you know some games punish you for doing the one thing they told you not to?",
  },
  {
    id: "fourth-wall",
    title: "Games That Break The Fourth Wall",
    hook: "Did you know some games know they are being played?",
  },
  {
    id: "afk-secret",
    title: "AFK Secrets In Video Games",
    hook: "Did you know some games hide secrets for players who do absolutely nothing?",
  },
  {
    id: "unnoticed-details",
    title: "Details In Your Favorite Games You Never Noticed",
    hook: "Did you know your favorite games are hiding details most players never notice?",
  },
  {
    id: "expect-unexpected",
    title: "Games Expect The Unexpected",
    hook: "Did you know some games are ready for choices you were never supposed to make?",
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function makeVideoThemeId(title: string) {
  const slug = slugify(title) || "topic";
  return `${slug}-${Date.now().toString(36)}`;
}

export function normalizeVideoTheme(theme: Partial<VideoTheme> & { description?: string; shortTitle?: string; tags?: string[] | string }): VideoTheme {
  const title = (theme.title ?? theme.shortTitle ?? "Untitled Topic").trim() || "Untitled Topic";
  const legacyDescription = typeof theme.description === "string" ? theme.description : "";
  const hook = (theme.hook ?? legacyDescription ?? "").trim();

  return {
    id: theme.id ?? makeVideoThemeId(title),
    title,
    hook,
  };
}

export function videoThemeToRow(theme: VideoTheme, sortOrder: number) {
  return {
    id: theme.id,
    title: theme.title,
    hook: theme.hook ?? "",
    sort_order: sortOrder,
  };
}

export function rowToVideoTheme(row: VideoThemeRow): VideoTheme {
  return normalizeVideoTheme({
    id: row.id,
    title: row.title,
    hook: row.hook ?? "",
  });
}

export function parseVideoThemes(value: string | null): VideoTheme[] {
  if (!value) return DEFAULT_VIDEO_THEMES;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return DEFAULT_VIDEO_THEMES;
    return parsed.map((item) => {
      const theme = normalizeVideoTheme(item);
      const defaultTheme = DEFAULT_VIDEO_THEMES.find((candidate) => candidate.id === theme.id);
      return theme.hook || !defaultTheme ? theme : { ...theme, hook: defaultTheme.hook };
    });
  } catch {
    return DEFAULT_VIDEO_THEMES;
  }
}

export function getVideoThemeById(themes: VideoTheme[], id: string | null | undefined) {
  return themes.find((theme) => theme.id === id) ?? null;
}

export function themeToHashtag(theme: VideoTheme) {
  return `#${theme.title.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase()}`;
}
