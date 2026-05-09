"use client";

import { useEffect } from "react";

export function useChapterEditorShortcuts({
  closeRewriteDialog,
  dirty,
  requestChapterMenuSearchFocus,
  setChapterMenuOpen,
  setCommandOpen,
  setCommandQuery,
  setMetaEditorKind,
  setMetaGenerateKind,
  setMetaGeneratePrompt,
  setRegenerateOpen,
}: {
  closeRewriteDialog: () => void;
  dirty: boolean;
  requestChapterMenuSearchFocus: () => void;
  setChapterMenuOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setCommandQuery: (query: string) => void;
  setMetaEditorKind: (kind: null) => void;
  setMetaGenerateKind: (kind: null) => void;
  setMetaGeneratePrompt: (prompt: string) => void;
  setRegenerateOpen: (open: boolean) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandQuery("");
        requestChapterMenuSearchFocus();
        setChapterMenuOpen(true);
      }
      if (event.key === "Escape") {
        setChapterMenuOpen(false);
        setCommandOpen(false);
        setCommandQuery("");
        setRegenerateOpen(false);
        closeRewriteDialog();
        setMetaGenerateKind(null);
        setMetaGeneratePrompt("");
        setMetaEditorKind(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeRewriteDialog,
    requestChapterMenuSearchFocus,
    setChapterMenuOpen,
    setCommandOpen,
    setCommandQuery,
    setMetaEditorKind,
    setMetaGenerateKind,
    setMetaGeneratePrompt,
    setRegenerateOpen,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
