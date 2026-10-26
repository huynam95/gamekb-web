import { redirect } from "next/navigation";

// Long videos were removed (the channel focuses on Shorts); old links land on Short Projects.
export default function LongVideosRemoved() {
  redirect("/scripts");
}
