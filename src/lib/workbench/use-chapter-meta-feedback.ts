"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

import { getAiMetaCopy } from "@/lib/copy/ai-zh-cn";

type MetaGenerateKind = "summary" | "outline";
export type MetaActionKind = MetaGenerateKind | "details";

export function clearTimer(ref: MutableRefObject<number | null>) {
  if (!ref.current) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}

export function useChapterMetaFeedback({
  detailsSaveTimerRef,
  outlineSaveTimerRef,
  setMetaActionError,
  summarySaveTimerRef,
}: {
  detailsSaveTimerRef: MutableRefObject<number | null>;
  outlineSaveTimerRef: MutableRefObject<number | null>;
  setMetaActionError: (
    value:
      | { kind: MetaActionKind; message: string }
      | null
      | ((current: { kind: MetaActionKind; message: string } | null) => {
          kind: MetaActionKind;
          message: string;
        } | null),
  ) => void;
  summarySaveTimerRef: MutableRefObject<number | null>;
}) {
  const metaActionErrorTimerRef = useRef<number | null>(null);
  const progressTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      [
        summarySaveTimerRef,
        outlineSaveTimerRef,
        detailsSaveTimerRef,
        metaActionErrorTimerRef,
      ].forEach(clearTimer);
      progressTimersRef.current.forEach((timer) => window.clearInterval(timer));
      progressTimersRef.current = [];
    };
  }, [detailsSaveTimerRef, outlineSaveTimerRef, summarySaveTimerRef]);

  const showMetaActionError = useCallback(
    (kind: MetaActionKind, message?: string) => {
      const resolvedMessage =
        message ||
        (kind === "details"
          ? getAiMetaCopy("details").emptyBody
          : getAiMetaCopy(kind).emptyBody);
      clearTimer(metaActionErrorTimerRef);
      setMetaActionError({ kind, message: resolvedMessage });
      metaActionErrorTimerRef.current = window.setTimeout(() => {
        setMetaActionError((current) => (current?.kind === kind ? null : current));
        metaActionErrorTimerRef.current = null;
      }, 2400);
    },
    [setMetaActionError],
  );

  const startProgress = useCallback((setter: (value: number) => void, step = 180) => {
    setter(8);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setter(Math.min(92, 8 + Math.floor((Date.now() - startedAt) / step)));
    }, 260);
    progressTimersRef.current.push(timer);
    return () => {
      window.clearInterval(timer);
      progressTimersRef.current = progressTimersRef.current.filter((item) => item !== timer);
    };
  }, []);

  return {
    showMetaActionError,
    startProgress,
  };
}
