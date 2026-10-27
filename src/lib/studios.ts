/**
 * Game studio / label (games.studio). Until a game has one saved, well-known
 * Rockstar Games titles are recognised by name so the Studio filter works for them.
 */

export const ROCKSTAR = "Rockstar Games";

const INFERRED: { studio: string; pattern: RegExp }[] = [
  { studio: ROCKSTAR, pattern: /^(grand theft auto|gta\b|red dead|rdr\s?\d|bully|max payne|l\.?a\.? noire|manhunt|midnight club|the warriors$|rockstar table tennis)/i },
];

/** Suggestions for the Studio field (studios already used are added at runtime). */
export const SUGGESTED_STUDIOS = [
  ROCKSTAR,
  "CD Projekt Red",
  "Naughty Dog",
  "Ubisoft",
  "Capcom",
  "Bethesda",
  "Insomniac Games",
  "Rocksteady Studios",
  "Techland",
  "FromSoftware",
  "Kojima Productions",
  "IO Interactive",
];

export function inferStudio(title: string | null | undefined) {
  const value = (title ?? "").trim();
  return INFERRED.find((rule) => rule.pattern.test(value))?.studio ?? null;
}

export function getGameStudio(game: { title?: string | null; studio?: string | null } | null | undefined) {
  if (!game) return null;
  return game.studio?.trim() || inferStudio(game.title) || null;
}

export function isMissingStudioColumn(error: { message?: string; code?: string } | null | undefined) {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /studio/i.test(error.message || "")));
}

export const STUDIO_SETUP_MESSAGE = "Saving a studio needs the database update database/migrations/20261027_add_game_studio.sql.";
