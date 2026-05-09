"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

import type {
  ContextEditorState,
  ForeshadowingItem,
  SettingItem,
  TimelineItem,
} from "./work-dashboard-context-types";

function buildEditorPayload(editor: ContextEditorState) {
  if (editor.kind === "foreshadowing") {
    return {
      title: editor.draft.title || null,
      hint: editor.draft.hint,
      payoff: editor.draft.payoff || null,
      status: editor.draft.status,
      importance: Number(editor.draft.importance || 50),
      plantedChapter: editor.draft.plantedChapter ? Number(editor.draft.plantedChapter) : null,
      resolvedChapter: editor.draft.resolvedChapter ? Number(editor.draft.resolvedChapter) : null,
    };
  }

  if (editor.kind === "setting") {
    return {
      kind: editor.draft.kind,
      name: editor.draft.name,
      desc: editor.draft.desc,
      firstChapter: editor.draft.firstChapter ? Number(editor.draft.firstChapter) : null,
      lastUpdatedChapter: editor.draft.lastUpdatedChapter
        ? Number(editor.draft.lastUpdatedChapter)
        : null,
    };
  }

  return {
    title: editor.draft.title || null,
    description: editor.draft.description || null,
    summary: editor.draft.summary,
    storyTime: editor.draft.storyTime || null,
    chapterIndex: editor.draft.chapterIndex ? Number(editor.draft.chapterIndex) : null,
    order: Number(editor.draft.order || 0),
    canonical: editor.draft.canonical === "true",
  };
}

function getEditorPath(workId: string, editor: ContextEditorState) {
  const encodedWorkId = encodeURIComponent(workId);
  const encodedId = encodeURIComponent(editor.id);

  if (editor.kind === "foreshadowing") {
    return `/api/works/${encodedWorkId}/foreshadowings/${encodedId}`;
  }

  if (editor.kind === "setting") {
    return `/api/works/${encodedWorkId}/settings/${encodedId}`;
  }

  return `/api/works/${encodedWorkId}/timeline/${encodedId}`;
}

export function useWorkDashboardContext(workId: string) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [foreshadowings, setForeshadowings] = useState<ForeshadowingItem[]>([]);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [editor, setEditor] = useState<ContextEditorState | null>(null);

  const loadContext = useCallback(async () => {
    if (!workId) return;

    setLoading(true);
    setError("");
    const [foreshadowingRes, settingsRes, timelineRes] = await Promise.all([
      apiRequest<{ foreshadowings: ForeshadowingItem[] }>(
        `/api/works/${encodeURIComponent(workId)}/foreshadowings`,
      ),
      apiRequest<{ settings: SettingItem[] }>(
        `/api/works/${encodeURIComponent(workId)}/settings`,
      ),
      apiRequest<{ events: TimelineItem[] }>(
        `/api/works/${encodeURIComponent(workId)}/timeline`,
      ),
    ]);

    if (foreshadowingRes.status === 401 || settingsRes.status === 401 || timelineRes.status === 401) {
      window.location.href = "/login";
      return;
    }

    setForeshadowings(
      foreshadowingRes.success && foreshadowingRes.data?.foreshadowings
        ? foreshadowingRes.data.foreshadowings
        : [],
    );
    setSettings(settingsRes.success && settingsRes.data?.settings ? settingsRes.data.settings : []);
    setTimeline(timelineRes.success && timelineRes.data?.events ? timelineRes.data.events : []);
    setError(
      [foreshadowingRes, settingsRes, timelineRes].find((response) => !response.success)
        ?.message || "",
    );
    setLoading(false);
  }, [workId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContext();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadContext]);

  const openForeshadowing = useCallback((item: ForeshadowingItem) => {
    setEditor({
      kind: "foreshadowing",
      id: item.id,
      draft: {
        title: item.title ?? "",
        hint: item.hint,
        payoff: item.payoff ?? "",
        status: item.status,
        importance: String(item.importance),
        plantedChapter: item.plantedChapter ? String(item.plantedChapter) : "",
        resolvedChapter: item.resolvedChapter ? String(item.resolvedChapter) : "",
      },
    });
  }, []);

  const openSetting = useCallback((item: SettingItem) => {
    setEditor({
      kind: "setting",
      id: item.id,
      draft: {
        kind: item.kind,
        name: item.name,
        desc: item.desc,
        firstChapter: item.firstChapter ? String(item.firstChapter) : "",
        lastUpdatedChapter: item.lastUpdatedChapter ? String(item.lastUpdatedChapter) : "",
      },
    });
  }, []);

  const openTimeline = useCallback((item: TimelineItem) => {
    setEditor({
      kind: "timeline",
      id: item.id,
      draft: {
        title: item.title ?? "",
        description: item.description ?? "",
        summary: item.summary,
        storyTime: item.storyTime ?? "",
        chapterIndex: item.chapterIndex ? String(item.chapterIndex) : "",
        order: String(item.order),
        canonical: item.canonical ? "true" : "false",
      },
    });
  }, []);

  const saveEditor = useCallback(async () => {
    if (!editor || !workId) return;

    setSaving(true);
    setError("");

    const res = await apiRequest(
      getEditorPath(workId, editor),
      buildEditorPayload(editor),
      { method: "PATCH" },
    );
    setSaving(false);

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.success) {
      setError(res.message || "保存失败");
      return;
    }

    setEditor(null);
    await loadContext();
  }, [editor, loadContext, workId]);

  return {
    editor,
    error,
    foreshadowings,
    loading,
    openForeshadowing,
    openSetting,
    openTimeline,
    saveEditor,
    saving,
    setEditor,
    settings,
    timeline,
    loadContext,
  };
}
