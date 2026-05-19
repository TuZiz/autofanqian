export function countNovelChars(text: string): number {
  return text.replace(/\s+/g, "").length;
}
