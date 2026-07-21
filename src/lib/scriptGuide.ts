export type ScriptGuideSection = {
  id: string;
  number: number | null;
  label: string;
  preview: string;
  start: number;
  end: number;
  isHook: boolean;
};

function inferGameLabel(block: string, fallback?: string) {
  const match = block.match(/^In\s+(.+?),\s/i);
  return match?.[1]?.trim() || fallback?.trim() || "Script section";
}

export function buildScriptGuide(content: string, fallbackGameLabels: string[] = []): ScriptGuideSection[] {
  if (!content.trim()) return [];

  const rawBlocks = content.split(/\n{2,}/);
  const sections: ScriptGuideSection[] = [];
  let cursor = 0;
  let ideaNumber = 0;

  rawBlocks.forEach((rawBlock, blockIndex) => {
    const rawStart = content.indexOf(rawBlock, cursor);
    if (rawStart < 0) return;
    cursor = rawStart + rawBlock.length;

    const leading = rawBlock.length - rawBlock.trimStart().length;
    const trailing = rawBlock.length - rawBlock.trimEnd().length;
    const block = rawBlock.trim();
    if (!block) return;

    const start = rawStart + leading;
    const end = rawStart + rawBlock.length - trailing;
    const isHook = sections.length === 0 && !/^In\s+/i.test(block);

    if (!isHook) ideaNumber += 1;
    const fallback = isHook ? undefined : fallbackGameLabels[ideaNumber - 1];
    const label = isHook ? "Opening Hook" : inferGameLabel(block, fallback);

    sections.push({
      id: `${blockIndex}-${start}`,
      number: isHook ? null : ideaNumber,
      label,
      preview: block.replace(/\s+/g, " ").slice(0, 110),
      start,
      end,
      isHook,
    });
  });

  return sections;
}
