export type ChapterDraft = {
  title?: string;
  content?: string;
};

function stripFence(text: string) {
  return (text ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonObjectCandidate(text: string) {
  const start = text.indexOf("{");
  if (start < 0) return null;

  const end = text.lastIndexOf("}");
  if (end < 0 || end <= start) {
    return text.slice(start);
  }

  return text.slice(start, end + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function looseUnescape(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function skipWhitespace(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function isQuoteTerminator(
  source: string,
  quoteIndex: number,
  options?: { stopAtKey?: "title" | "content"; requireEndBrace?: boolean },
) {
  const nextIndex = skipWhitespace(source, quoteIndex + 1);
  const nextChar = source[nextIndex];

  if (options?.stopAtKey) {
    if (nextChar !== ",") return false;
    const afterComma = skipWhitespace(source, nextIndex + 1);
    const keyRegex = new RegExp(
      `(?:\"|')?${options.stopAtKey}(?:\"|')?\\s*:`,
      "i",
    );
    return keyRegex.test(source.slice(afterComma));
  }

  if (options?.requireEndBrace) {
    return nextChar === "}" || nextChar === undefined;
  }

  return nextChar === "," || nextChar === "}" || nextChar === undefined;
}

function findClosingQuote(
  source: string,
  start: number,
  quote: '"' | "'",
  options?: { stopAtKey?: "title" | "content"; requireEndBrace?: boolean },
) {
  let escaped = false;

  for (let index = start + 1; index < source.length; index += 1) {
    const ch = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === quote) {
      if (isQuoteTerminator(source, index, options)) {
        return index;
      }
    }
  }

  return null;
}

function extractQuotedValue(
  source: string,
  start: number,
  quote: '"' | "'",
  options?: { stopAtKey?: "title" | "content"; requireEndBrace?: boolean },
) {
  const end = findClosingQuote(source, start, quote, options);
  if (end === null) {
    const fallback = source
      .slice(start + 1)
      .replace(/\s*}+\s*$/, "")
      .trimEnd();
    const normalized = looseUnescape(fallback).trim();
    return normalized ? normalized : undefined;
  }

  const raw = source.slice(start, end + 1);

  if (quote === '"') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "string" ? parsed : undefined;
    } catch {
      return looseUnescape(raw.slice(1, -1));
    }
  }

  return looseUnescape(raw.slice(1, -1));
}

function extractJsonishField(
  source: string,
  key: "title" | "content",
  options?: { stopAtKey?: "title" | "content" },
) {
  const keyRegex = new RegExp(`(?:\"|')?${key}(?:\"|')?\\s*:\\s*`, "i");
  const match = keyRegex.exec(source);
  if (!match) return undefined;

  let cursor = match.index + match[0].length;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }

  const first = source[cursor];
  if (first === '"' || first === "'") {
    const value = extractQuotedValue(source, cursor, first, {
      stopAtKey: options?.stopAtKey,
      requireEndBrace: key === "content" && !options?.stopAtKey,
    });
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  let endIndex = source.length;

  if (options?.stopAtKey) {
    const stopRe = new RegExp(
      `\\s*,?\\s*(?:\"|')?${options.stopAtKey}(?:\"|')?\\s*:\\s*`,
      "i",
    );
    const stopMatch = stopRe.exec(source.slice(cursor));
    if (stopMatch) {
      endIndex = cursor + stopMatch.index;
    }
  } else {
    const brace = source.indexOf("}", cursor);
    if (brace >= 0) {
      endIndex = brace;
    }
  }

  const raw = source.slice(cursor, endIndex);
  const cleaned = raw
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "")
    .trim();

  if (!cleaned) return undefined;

  const unwrapped = cleaned.replace(/^["']+|["']+$/g, "");
  const normalized = looseUnescape(unwrapped).trim();
  return normalized ? normalized : undefined;
}

export function extractChapterDraftFromText(text: string): ChapterDraft | null {
  const cleaned = stripFence(text);
  if (!cleaned) return null;

  const candidate = extractJsonObjectCandidate(cleaned);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (isRecord(parsed)) {
      const title = typeof parsed.title === "string" ? parsed.title.trim() : undefined;
      const content =
        typeof parsed.content === "string" ? parsed.content.trim() : undefined;

      if (title || content) {
        return { title: title || undefined, content: content || undefined };
      }
    }
  } catch {
    // ignore and fall back to a more tolerant parser
  }

  const content = extractJsonishField(candidate, "content");
  const title = extractJsonishField(candidate, "title", { stopAtKey: "content" });

  if (!title && !content) return null;
  return { title, content };
}
