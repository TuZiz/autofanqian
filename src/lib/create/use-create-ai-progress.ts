"use client";

import { useEffect, useRef, useState } from "react";

import { AI_THINKING_COPY } from "./dashboard-create-utils";

export function useCreateAiProgress(aiBusy: boolean) {
  const [aiProgress, setAiProgress] = useState(0);
  const [aiThinkingCopyIndex, setAiThinkingCopyIndex] = useState(0);
  const aiProgressIntervalRef = useRef<number | null>(null);
  const aiProgressResetRef = useRef<number | null>(null);
  const aiThinkingCopyIntervalRef = useRef<number | null>(null);

  const aiThinkingCopy = AI_THINKING_COPY[aiThinkingCopyIndex] ?? AI_THINKING_COPY[0];
  const showAiProgress = aiBusy || aiProgress > 0;
  const aiProgressValue = Math.max(0, Math.min(100, aiProgress));
  const aiProgressPercent = Math.round(aiProgressValue);
  const aiProgressLabelLeft = Math.min(97, Math.max(3, aiProgressValue));

  function clearAiProgressTimers() {
    if (aiProgressIntervalRef.current) {
      window.clearInterval(aiProgressIntervalRef.current);
      aiProgressIntervalRef.current = null;
    }

    if (aiProgressResetRef.current) {
      window.clearTimeout(aiProgressResetRef.current);
      aiProgressResetRef.current = null;
    }
  }

  function clearAiThinkingCopyTimer() {
    if (aiThinkingCopyIntervalRef.current) {
      window.clearInterval(aiThinkingCopyIntervalRef.current);
      aiThinkingCopyIntervalRef.current = null;
    }
  }

  function startAiThinkingCopyLoop() {
    clearAiThinkingCopyTimer();
    setAiThinkingCopyIndex(0);

    aiThinkingCopyIntervalRef.current = window.setInterval(() => {
      setAiThinkingCopyIndex((current) => (current + 1) % AI_THINKING_COPY.length);
    }, 1400);
  }

  function stopAiThinkingCopyLoop() {
    clearAiThinkingCopyTimer();
    setAiThinkingCopyIndex(0);
  }

  function startAiProgress() {
    clearAiProgressTimers();
    startAiThinkingCopyLoop();
    setAiProgress(6);

    aiProgressIntervalRef.current = window.setInterval(() => {
      setAiProgress((current) => {
        const cap = 92;
        if (current >= cap) return current;

        const remaining = cap - current;
        const step = Math.min(1, Math.max(0.12, remaining * 0.04));
        return Math.min(cap, current + step);
      });
    }, 40);
  }

  function finishAiProgress() {
    clearAiProgressTimers();
    stopAiThinkingCopyLoop();
    setAiProgress(100);
    aiProgressResetRef.current = window.setTimeout(() => {
      setAiProgress(0);
    }, 650);
  }

  useEffect(() => {
    return () => {
      clearAiProgressTimers();
      clearAiThinkingCopyTimer();
    };
  }, []);

  return {
    aiProgressLabelLeft,
    aiProgressPercent,
    aiProgressValue,
    aiThinkingCopy,
    aiThinkingCopyIndex,
    finishAiProgress,
    showAiProgress,
    startAiProgress,
  };
}
