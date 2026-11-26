"use client";

import { useMemo, useState } from "react";
import { ClipboardDocumentIcon, ExclamationTriangleIcon, FilmIcon } from "@heroicons/react/24/outline";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { estimateSeconds, type ProjectIdea } from "@/lib/projectIdeas";
import { guessAssignments, hookIndex, splitPastedScript } from "@/lib/pasteScript";

/**
 * Paste the polished script into a project. Shows how each paragraph lines up
 * with the project's ideas (editable) before replacing the script.
 */
export function PasteScriptModal({
  ideas,
  currentLines,
  currentWords,
  onApply,
  onClose,
}: {
  ideas: ProjectIdea[];
  /** Each idea's current line in the script, to recognise its rewritten version. */
  currentLines: Map<number, string>;
  currentWords: number;
  onApply: (blocks: string[], assignments: (number | null)[]) => void;
  onClose: () => void;
}) {
  // Taken once when the dialog opens, so autosaves behind it do not reshuffle the guesses.
  const [lines] = useState(currentLines);
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<Map<number, number | null>>(() => new Map());
  const [clipboardError, setClipboardError] = useState("");

  const blocks = useMemo(() => splitPastedScript(text), [text]);
  const hook = hookIndex(blocks);
  const guessed = useMemo(() => guessAssignments(blocks, ideas, lines), [blocks, ideas, lines]);

  // Manual picks win; picking an idea for one paragraph frees it everywhere else.
  const assignments = useMemo(() => {
    const result = guessed.map((id, index) => (overrides.has(index) ? overrides.get(index) ?? null : id));
    overrides.forEach((id, index) => {
      if (id == null) return;
      result.forEach((other, j) => { if (j !== index && other === id && !overrides.has(j)) result[j] = null; });
    });
    return result.map((id, index) => (index === hook ? null : id));
  }, [guessed, overrides, hook]);

  const ideaById = useMemo(() => new Map(ideas.map((idea) => [idea.id, idea])), [ideas]);
  const matched = new Set(assignments.filter((id): id is number => id != null));
  const leftOut = ideas.filter((idea) => !matched.has(idea.id));
  const length = estimateSeconds(blocks.join("\n\n"));

  const pick = (index: number, value: string) => {
    const id = value === "" ? null : Number(value);
    setOverrides((current) => {
      const next = new Map(current);
      if (id != null) next.forEach((other, j) => { if (j !== index && other === id) next.set(j, null); });
      next.set(index, id);
      return next;
    });
  };

  const changeText = (value: string) => {
    setText(value);
    setOverrides(new Map());
  };

  const pasteFromClipboard = async () => {
    setClipboardError("");
    try {
      const value = await navigator.clipboard.readText();
      if (!value.trim()) { setClipboardError("The clipboard is empty."); return; }
      changeText(value);
    } catch {
      setClipboardError("The browser blocked reading the clipboard. Click in the box and press Ctrl+V instead.");
    }
  };

  return (
    <Modal open onClose={onClose} size="xl" zClass="z-[99990]" labelledBy="paste-script-title">
      <ModalHeader id="paste-script-title" eyebrow="Short project" title="Paste final script" onClose={onClose}>
        <p className="mt-1 text-sm text-fg-3">Replace the script with the version you polished. Each paragraph is matched to an idea so its clips follow.</p>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="paste-script-text" className="text-sm font-semibold text-fg">Your script</label>
            <Button size="sm" variant="secondary" onClick={() => void pasteFromClipboard()}><ClipboardDocumentIcon className="h-4 w-4" /> Paste from clipboard</Button>
          </div>
          <textarea
            id="paste-script-text"
            autoFocus
            value={text}
            onChange={(event) => changeText(event.target.value)}
            rows={blocks.length ? 6 : 10}
            placeholder={"Opening hook…\n\nIn Red Dead Redemption 2, …\n\nIn GTA V, …"}
            className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 text-fg outline-none placeholder:text-fg-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          {clipboardError && <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">{clipboardError}</p>}
          <p className="mt-1.5 text-xs text-fg-4">Keep a blank line between paragraphs (one line per paragraph also works). The first paragraph is the hook unless it starts with “In &lt;game&gt;,”.</p>
        </div>

        {blocks.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg">How it lines up</h3>
              <p className="text-xs text-fg-3 tabular-nums">{blocks.length} paragraph{blocks.length === 1 ? "" : "s"} · {length.words} words (was {currentWords}) · ≈ {length.seconds}s</p>
            </div>
            <ol className="space-y-2">
              {blocks.map((block, index) => {
                const isHook = index === hook;
                const ideaId = assignments[index];
                const idea = ideaId != null ? ideaById.get(ideaId) : undefined;
                const number = hook === 0 ? index : index + 1;
                return (
                  <li key={index} className={`grid gap-2 rounded-2xl border border-l-4 bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-start ${isHook ? "border-line border-l-cyan-400" : idea ? "border-line border-l-blue-500/60" : "border-amber-300 border-l-amber-400 dark:border-amber-500/40"}`}>
                    <div className="flex min-w-0 gap-2.5">
                      <span className={`mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums ${isHook ? "bg-brand-cyan text-slate-950" : idea ? "bg-blue-600 text-white" : "bg-amber-400 text-slate-950"}`}>{isHook ? "H" : number}</span>
                      <p className="line-clamp-3 whitespace-pre-line text-sm leading-6 text-fg-2">{block}</p>
                    </div>
                    {isHook ? (
                      <p className="text-xs font-semibold text-cyan-700 sm:pt-1 sm:text-right dark:text-cyan-300">Opening hook</p>
                    ) : (
                      <div className="min-w-0">
                        <select
                          value={ideaId ?? ""}
                          onChange={(event) => pick(index, event.target.value)}
                          aria-label={`Idea for paragraph ${number}`}
                          className={`h-9 w-full cursor-pointer truncate rounded-lg border px-2 text-xs font-semibold outline-none focus:border-blue-500 ${idea ? "border-line bg-surface-muted text-fg" : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"}`}
                        >
                          <option value="">No idea (text only)</option>
                          {ideas.map((option) => (
                            <option key={option.id} value={option.id}>{option.game_title ? `${option.game_title} · ` : ""}{option.title}</option>
                          ))}
                        </select>
                        {idea && idea.clips.length > 0 && <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-fg-4"><FilmIcon className="h-3.5 w-3.5" /> {idea.clips.length === 1 ? "1 clip follows" : `${idea.clips.length} clips follow`} this line</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {leftOut.length > 0 && (
              <div className="mt-3 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                <p><span className="font-semibold">Not in the new script:</span> {leftOut.map((idea) => idea.title).join(" · ")}. They stay in the project; their clips move to “Other clips”.</p>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="items-center">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!blocks.length} onClick={() => onApply(blocks, assignments)}>Replace script</Button>
      </ModalFooter>
    </Modal>
  );
}
