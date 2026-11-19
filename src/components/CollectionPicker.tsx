"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, FolderIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Group } from "@/types/gamekb";

export type CollectionChange = { group: Group; ideaIds: number[]; added: boolean };

/**
 * Put one or several ideas in collections, or take them out. Each tick saves
 * straight away; a new collection can be made from the search box.
 */
export function CollectionPicker({
  ideaIds,
  label,
  groups,
  onChange,
  onCreateGroup,
  onClose,
}: {
  ideaIds: number[];
  /** What is being sorted, e.g. the idea title or "5 ideas". */
  label: string;
  groups: Group[];
  onChange: (change: CollectionChange) => void;
  onCreateGroup: (group: Group) => void;
  onClose: () => void;
}) {
  const { error: notifyError } = useNotifications();
  const [members, setMembers] = useState<Map<number, Set<number>> | null>(null); // group id → idea ids in it
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const idsKey = ideaIds.join(",");

  useEffect(() => {
    let active = true;
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    supabase.from("idea_group_items").select("group_id,detail_id").in("detail_id", ids).then(({ data, error }) => {
      if (!active) return;
      if (error) notifyError(error.message, "Could not load collections");
      const map = new Map<number, Set<number>>();
      for (const row of (data ?? []) as { group_id: number; detail_id: number }[]) {
        if (!map.has(row.group_id)) map.set(row.group_id, new Set());
        map.get(row.group_id)!.add(row.detail_id);
      }
      setMembers(map);
    });
    return () => { active = false; };
    // Load once per set of ideas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const needle = query.trim().toLowerCase();
  const sorted = useMemo(() => {
    const list = groups.filter((group) => !needle || group.name.toLowerCase().includes(needle));
    // Collections the ideas are already in come first.
    return list.sort((a, b) => {
      const inA = members?.get(a.id)?.size ?? 0;
      const inB = members?.get(b.id)?.size ?? 0;
      return (inB > 0 ? 1 : 0) - (inA > 0 ? 1 : 0) || a.name.localeCompare(b.name);
    });
    // Sort on open and on search, not on every tick, so rows don't jump under the pointer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, needle, members === null]);
  const exactMatch = groups.some((group) => group.name.trim().toLowerCase() === needle);

  const toggle = async (group: Group) => {
    if (!members) return;
    const inGroup = members.get(group.id) ?? new Set<number>();
    const allIn = ideaIds.every((id) => inGroup.has(id));
    setBusy(group.id);
    if (allIn) {
      const { error } = await supabase.from("idea_group_items").delete().eq("group_id", group.id).in("detail_id", ideaIds);
      setBusy(null);
      if (error) { notifyError(error.message, "Not removed"); return; }
      setMembers((current) => new Map(current).set(group.id, new Set()));
      onChange({ group, ideaIds, added: false });
    } else {
      const missing = ideaIds.filter((id) => !inGroup.has(id));
      const { error } = await supabase.from("idea_group_items").insert(missing.map((id) => ({ group_id: group.id, detail_id: id, position: 0 })));
      setBusy(null);
      if (error) { notifyError(error.message, "Not added"); return; }
      setMembers((current) => new Map(current).set(group.id, new Set([...inGroup, ...missing])));
      onChange({ group, ideaIds: missing, added: true });
    }
  };

  const createAndAdd = async () => {
    const name = query.trim();
    if (!name || exactMatch) return;
    setBusy("new");
    const { data, error } = await supabase.from("idea_groups").insert({ name }).select("id,name").single();
    if (error || !data) {
      setBusy(null);
      notifyError(error?.message || "Could not create collection", "Not created");
      return;
    }
    const group = data as Group;
    onCreateGroup(group);
    const { error: addError } = await supabase.from("idea_group_items").insert(ideaIds.map((id) => ({ group_id: group.id, detail_id: id, position: 0 })));
    setBusy(null);
    if (addError) { notifyError(addError.message, "Created, but not added"); return; }
    setMembers((current) => new Map(current).set(group.id, new Set(ideaIds)));
    onChange({ group, ideaIds, added: true });
    setQuery("");
  };

  const many = ideaIds.length > 1;

  return (
    <Modal open onClose={onClose} size="sm" zClass="z-[99990]" labelledBy="collection-picker-title">
      <ModalHeader id="collection-picker-title" eyebrow="Collections" title={many ? `Sort ${ideaIds.length} ideas` : "Put in collections"} onClose={onClose}>
        <p className="mt-1 line-clamp-1 text-sm text-fg-3">{label}</p>
      </ModalHeader>
      <ModalBody className="space-y-3">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (sorted.length === 1) void toggle(sorted[0]); else void createAndAdd(); } }}
            placeholder="Find or create a collection…"
            aria-label="Find or create a collection"
            className="h-11 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none focus:border-blue-500"
          />
        </label>

        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto" aria-busy={members === null}>
          {members === null && [0, 1, 2].map((i) => <li key={i} className="h-11 animate-pulse rounded-xl bg-surface-sunken" />)}
          {members && sorted.map((group) => {
            const count = members.get(group.id)?.size ?? 0;
            const state = count === 0 ? "none" : count >= ideaIds.length ? "all" : "some";
            return (
              <li key={group.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
                  disabled={busy !== null}
                  onClick={() => void toggle(group)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-wait ${state === "none" ? "hover:bg-surface-sunken" : "bg-accent-soft hover:bg-blue-100 dark:hover:bg-blue-500/20"}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${state === "none" ? "border-line-strong" : "border-blue-600 bg-blue-600 text-white"}`}>
                    {state === "all" && <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />}
                    {state === "some" && <MinusIcon className="h-3.5 w-3.5 stroke-[3]" />}
                  </span>
                  <FolderIcon className={`h-4 w-4 shrink-0 ${state === "none" ? "text-fg-4" : "text-sky-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{group.name}</span>
                  {many && state === "some" && <span className="shrink-0 text-[11px] font-medium text-fg-3">{count} of {ideaIds.length}</span>}
                  {busy === group.id && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
                </button>
              </li>
            );
          })}
          {members && sorted.length === 0 && !needle && <li className="px-3 py-6 text-center text-sm text-fg-4">No collections yet. Type a name to make one.</li>}
          {members && needle && !exactMatch && (
            <li>
              <button type="button" disabled={busy !== null} onClick={() => void createAndAdd()} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:cursor-wait">
                <PlusIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">Create “{query.trim()}”{many ? ` with these ${ideaIds.length} ideas` : ""}</span>
                {busy === "new" && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
              </button>
            </li>
          )}
        </ul>
        {many && <p className="text-xs text-fg-4">Tick to add all of them; tick again to take all of them out. Each tick saves right away.</p>}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
}
