/**
 * Hand-off between the idea library and the idea detail page: when a card is
 * opened we keep what the card already knows (title, text, type, game cover),
 * so the detail page can show it immediately while the rest loads.
 */

export type IdeaPreview = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  game_id: number;
  pinned?: boolean;
  created_at?: string | null;
  game?: { id: number; title: string; release_year?: number | null; cover_url?: string | null } | null;
};

// Kept in memory, not in storage: it only exists after an in-app navigation,
// so a fresh page load renders the same thing on the server and the client.
const previews = new Map<number, IdeaPreview>();

export function rememberIdeaPreview(idea: IdeaPreview) {
  const game = idea.game ? { id: idea.game.id, title: idea.game.title, release_year: idea.game.release_year ?? null, cover_url: idea.game.cover_url ?? null } : null;
  previews.set(idea.id, { id: idea.id, title: idea.title, description: idea.description, detail_type: idea.detail_type, game_id: idea.game_id, pinned: Boolean(idea.pinned), created_at: idea.created_at ?? null, game });
}

export function readIdeaPreview(id: number): IdeaPreview | null {
  return previews.get(id) ?? null;
}
