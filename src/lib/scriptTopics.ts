type TopicSource = {
  topic?: string | null;
  description?: string | null;
  tags?: string[] | null;
};

export function getScriptTopicValue(script: TopicSource): string {
  // An empty string is an explicit "No topic" choice, not a legacy fallback.
  if (typeof script.topic === "string") return script.topic.trim();
  const match = (script.description || "").match(/(?:^|\n)[ \t]*Topic:[ \t]*([^\r\n]*)/i);
  const legacyTopic = match?.[1]?.trim();
  if (legacyTopic) return legacyTopic;
  return script.tags?.find((tag) => /^games\s|^afk\s|details/i.test(tag))?.trim() || "";
}

export function getScriptTopic(script: TopicSource): string {
  return getScriptTopicValue(script) || "No topic";
}
