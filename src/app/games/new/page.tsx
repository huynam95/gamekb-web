import { redirect } from "next/navigation";

// Adding a game now lives inside Add Idea, so old links and bookmarks open
// that page with the new-game form already showing.
export default function AddGamePage() {
  redirect("/add?newGame=1");
}
