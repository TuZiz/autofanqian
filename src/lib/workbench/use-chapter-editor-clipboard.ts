"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CopyTarget } from "./chapter-editor-types";

export function useChapterEditorClipboard() {
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const copyResetTimerRef = useRef<number | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (!copyResetTimerRef.current) return;
    window.clearTimeout(copyResetTimerRef.current);
    copyResetTimerRef.current = null;
  }, []);

  useEffect(() => clearCopyTimer, [clearCopyTimer]);

  const handleCopy = useCallback(
    async (kind: CopyTarget, value: string) => {
      const text = value.trimEnd();
      if (!text.trim()) return;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedTarget(kind);
      clearCopyTimer();
      copyResetTimerRef.current = window.setTimeout(() => setCopiedTarget(null), 1400);
    },
    [clearCopyTimer],
  );

  return {
    copiedTarget,
    handleCopy,
  };
}
