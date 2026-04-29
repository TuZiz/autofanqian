export const CUSTOM_GENRE_ID = "custom";
export const AI_THINKING_COPY = ["AI 思考中...", "文本较长...", "请等待..."] as const;

export function extractBookName(label: string) {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return "";
  const index = trimmed.search(/[（(]/);
  return (index >= 0 ? trimmed.slice(0, index) : trimmed).trim();
}

export function parseTagInput(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[\s,，、；;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 12);
}
