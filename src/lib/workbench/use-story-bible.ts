"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { StoryBiblePayload, StoryBibleSection } from "@/shared/schemas/story-bible";

export type { StoryBibleSection };

type StoryBibleBaseItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type StoryBibleCharacter = StoryBibleBaseItem & {
  name: string;
  aliases: string[];
  identity: string | null;
  role: string;
  desc: string;
  personality: string | null;
  goal: string | null;
  secret: string | null;
  appearance: string | null;
  notes: string | null;
  arc: string | null;
  currentState: string | null;
  firstChapter: number | null;
  lastChapter: number | null;
};

export type StoryBibleWorldSetting = StoryBibleBaseItem & {
  kind: string;
  name: string;
  desc: string;
  firstChapter: number | null;
  lastUpdatedChapter: number | null;
};

export type StoryBibleTimelineEvent = StoryBibleBaseItem & {
  chapterIndex: number | null;
  order: number;
  title: string | null;
  summary: string;
  description: string | null;
  storyTime: string | null;
  canonical: boolean;
};

export type StoryBibleForeshadowing = StoryBibleBaseItem & {
  plantedChapter: number | null;
  resolvedChapter: number | null;
  status: string;
  title: string | null;
  description: string | null;
  importance: number;
  hint: string;
  payoff: string | null;
};

export type StoryBibleRelationship = StoryBibleBaseItem & {
  characterAName: string;
  characterBName: string;
  status: string;
  conflict: string | null;
  recentChangeChapter: number | null;
};

export type StoryBibleWritingMemory = StoryBibleBaseItem & {
  kind: string;
  priority: number;
  content: string;
  source: string | null;
  isActive: boolean;
};

export type StoryBibleData = {
  characters: StoryBibleCharacter[];
  worldSettings: StoryBibleWorldSetting[];
  timelineEvents: StoryBibleTimelineEvent[];
  foreshadowings: StoryBibleForeshadowing[];
  relationships: StoryBibleRelationship[];
  writingMemories: StoryBibleWritingMemory[];
};

export type StoryBibleItem =
  | StoryBibleCharacter
  | StoryBibleWorldSetting
  | StoryBibleTimelineEvent
  | StoryBibleForeshadowing
  | StoryBibleRelationship
  | StoryBibleWritingMemory;

export type StoryBibleDraft = {
  name: string;
  title: string;
  kind: string;
  role: string;
  desc: string;
  summary: string;
  description: string;
  content: string;
  firstChapter: string;
  lastChapter: string;
  lastUpdatedChapter: string;
  chapterIndex: string;
  plantedChapter: string;
  resolvedChapter: string;
  hint: string;
  payoff: string;
  status: string;
  characterAName: string;
  characterBName: string;
  conflict: string;
  recentChangeChapter: string;
  priority: string;
  source: string;
  storyTime: string;
  order: string;
  currentState: string;
};

export type StoryBibleEditorState = {
  id?: string;
  section: StoryBibleSection;
  draft: StoryBibleDraft;
};

const emptyBible: StoryBibleData = {
  characters: [],
  worldSettings: [],
  timelineEvents: [],
  foreshadowings: [],
  relationships: [],
  writingMemories: [],
};

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function numberOrDefault(value: string, fallback: number) {
  const parsed = numberOrNull(value);
  return parsed ?? fallback;
}

function createDraft(section: StoryBibleSection): StoryBibleDraft {
  return {
    name: "",
    title: "",
    kind: section === "worldSettings" ? "设定" : section === "writingMemories" ? "fact" : "",
    role: section === "characters" ? "supporting" : "",
    desc: "",
    summary: "",
    description: "",
    content: "",
    firstChapter: "",
    lastChapter: "",
    lastUpdatedChapter: "",
    chapterIndex: "",
    plantedChapter: "",
    resolvedChapter: "",
    hint: "",
    payoff: "",
    status: section === "foreshadowings" ? "open" : section === "relationships" ? "关联" : "",
    characterAName: "",
    characterBName: "",
    conflict: "",
    recentChangeChapter: "",
    priority: section === "writingMemories" ? "60" : "50",
    source: "story_bible",
    storyTime: "",
    order: "0",
    currentState: "",
  };
}

function itemToDraft(section: StoryBibleSection, item: StoryBibleItem): StoryBibleDraft {
  const draft = createDraft(section);

  if (section === "characters") {
    const row = item as StoryBibleCharacter;
    return {
      ...draft,
      name: row.name,
      role: row.role,
      desc: row.desc,
      firstChapter: row.firstChapter ? String(row.firstChapter) : "",
      lastChapter: row.lastChapter ? String(row.lastChapter) : "",
      currentState: row.currentState ?? "",
    };
  }

  if (section === "worldSettings") {
    const row = item as StoryBibleWorldSetting;
    return {
      ...draft,
      kind: row.kind,
      name: row.name,
      desc: row.desc,
      firstChapter: row.firstChapter ? String(row.firstChapter) : "",
      lastUpdatedChapter: row.lastUpdatedChapter ? String(row.lastUpdatedChapter) : "",
    };
  }

  if (section === "timelineEvents") {
    const row = item as StoryBibleTimelineEvent;
    return {
      ...draft,
      title: row.title ?? "",
      summary: row.summary,
      description: row.description ?? "",
      chapterIndex: row.chapterIndex ? String(row.chapterIndex) : "",
      storyTime: row.storyTime ?? "",
      order: String(row.order),
    };
  }

  if (section === "foreshadowings") {
    const row = item as StoryBibleForeshadowing;
    return {
      ...draft,
      title: row.title ?? "",
      description: row.description ?? "",
      hint: row.hint,
      payoff: row.payoff ?? "",
      status: row.status,
      priority: String(row.importance),
      plantedChapter: row.plantedChapter ? String(row.plantedChapter) : "",
      resolvedChapter: row.resolvedChapter ? String(row.resolvedChapter) : "",
    };
  }

  if (section === "relationships") {
    const row = item as StoryBibleRelationship;
    return {
      ...draft,
      characterAName: row.characterAName,
      characterBName: row.characterBName,
      status: row.status,
      conflict: row.conflict ?? "",
      recentChangeChapter: row.recentChangeChapter ? String(row.recentChangeChapter) : "",
    };
  }

  const row = item as StoryBibleWritingMemory;
  return {
    ...draft,
    kind: row.kind,
    priority: String(row.priority),
    content: row.content,
    source: row.source ?? "story_bible",
  };
}

function buildPayload(section: StoryBibleSection, draft: StoryBibleDraft): StoryBiblePayload {
  if (section === "characters") {
    return {
      name: draft.name,
      role: draft.role || "supporting",
      desc: draft.desc,
      currentState: draft.currentState || null,
      firstChapter: numberOrNull(draft.firstChapter),
      lastChapter: numberOrNull(draft.lastChapter),
    };
  }

  if (section === "worldSettings") {
    return {
      kind: draft.kind || "设定",
      name: draft.name,
      desc: draft.desc,
      firstChapter: numberOrNull(draft.firstChapter),
      lastUpdatedChapter: numberOrNull(draft.lastUpdatedChapter),
    };
  }

  if (section === "timelineEvents") {
    return {
      title: draft.title || null,
      summary: draft.summary,
      description: draft.description || null,
      chapterIndex: numberOrNull(draft.chapterIndex),
      storyTime: draft.storyTime || null,
      order: numberOrDefault(draft.order, 0),
      canonical: true,
    };
  }

  if (section === "foreshadowings") {
    return {
      title: draft.title || null,
      description: draft.description || null,
      hint: draft.hint,
      payoff: draft.payoff || null,
      status: draft.status || "open",
      priority: numberOrDefault(draft.priority, 50),
      plantedChapter: numberOrNull(draft.plantedChapter),
      resolvedChapter: numberOrNull(draft.resolvedChapter),
    };
  }

  if (section === "relationships") {
    return {
      characterAName: draft.characterAName,
      characterBName: draft.characterBName,
      status: draft.status || "关联",
      conflict: draft.conflict || null,
      recentChangeChapter: numberOrNull(draft.recentChangeChapter),
    };
  }

  return {
    kind: draft.kind || "fact",
    priority: numberOrDefault(draft.priority, 60),
    content: draft.content,
    source: draft.source || "story_bible",
    isActive: true,
  };
}

export function useStoryBible(workId: string) {
  const [data, setData] = useState<StoryBibleData>(emptyBible);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [fromChapter, setFromChapter] = useState("");
  const [toChapter, setToChapter] = useState("");
  const [activeSection, setActiveSection] = useState<StoryBibleSection>("characters");
  const [editor, setEditor] = useState<StoryBibleEditorState | null>(null);
  const [extractChapterIndex, setExtractChapterIndex] = useState("1");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (fromChapter.trim()) params.set("fromChapter", fromChapter.trim());
    if (toChapter.trim()) params.set("toChapter", toChapter.trim());
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [fromChapter, search, toChapter]);

  const loadBible = useCallback(async () => {
    if (!workId) return;
    setLoading(true);
    setError("");
    const response = await apiRequest<StoryBibleData>(
      `/api/works/${encodeURIComponent(workId)}/bible${queryString}`,
    );
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.message || "故事圣经加载失败。");
      return;
    }
    setData(response.data);
  }, [queryString, workId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBible(), 120);
    return () => window.clearTimeout(timer);
  }, [loadBible]);

  const openCreate = useCallback((section: StoryBibleSection) => {
    setActiveSection(section);
    setError("");
    setEditor({ section, draft: createDraft(section) });
  }, []);

  const openEdit = useCallback((section: StoryBibleSection, item: StoryBibleItem) => {
    setActiveSection(section);
    setError("");
    setEditor({ id: item.id, section, draft: itemToDraft(section, item) });
  }, []);

  const updateDraft = useCallback((patch: Partial<StoryBibleDraft>) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            draft: { ...current.draft, ...patch },
          }
        : current,
    );
  }, []);

  const saveEditor = useCallback(async () => {
    if (!workId || !editor || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const payload = buildPayload(editor.section, editor.draft);
    const path = editor.id
      ? `/api/works/${encodeURIComponent(workId)}/bible/${editor.section}/${encodeURIComponent(editor.id)}`
      : `/api/works/${encodeURIComponent(workId)}/bible?section=${editor.section}`;
    const response = await apiRequest(path, payload, {
      method: editor.id ? "PATCH" : "POST",
    });
    setSaving(false);

    if (!response.success) {
      setError(response.message || "故事圣经保存失败。");
      return;
    }

    setEditor(null);
    setNotice(response.message || "故事圣经已更新。");
    await loadBible();
  }, [editor, loadBible, saving, workId]);

  const deleteItem = useCallback(async (section: StoryBibleSection, itemId: string) => {
    if (!workId || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const response = await apiRequest(
      `/api/works/${encodeURIComponent(workId)}/bible/${section}/${encodeURIComponent(itemId)}`,
      undefined,
      { method: "DELETE" },
    );
    setSaving(false);
    if (!response.success) {
      setError(response.message || "条目删除失败。");
      return;
    }
    setNotice(response.message || "条目已删除。");
    await loadBible();
  }, [loadBible, saving, workId]);

  const extractFromChapter = useCallback(async () => {
    if (!workId || extracting) return;
    const chapterIndex = numberOrNull(extractChapterIndex);
    if (!chapterIndex) {
      setError("请填写要提取的章节序号。");
      return;
    }
    setExtracting(true);
    setError("");
    setNotice("");
    const response = await apiRequest<{ queued: boolean }>(
      `/api/works/${encodeURIComponent(workId)}/bible/extract`,
      { chapterIndex, force: true },
    );
    setExtracting(false);
    if (!response.success) {
      setError(response.message || "AI 提取故事圣经失败。");
      return;
    }
    setNotice(response.message || "AI 已提取故事圣经。");
    await loadBible();
  }, [extractChapterIndex, extracting, loadBible, workId]);

  return {
    activeSection,
    data,
    deleteItem,
    editor,
    error,
    extractChapterIndex,
    extractFromChapter,
    extracting,
    fromChapter,
    loadBible,
    loading,
    notice,
    openCreate,
    openEdit,
    saveEditor,
    saving,
    search,
    setActiveSection,
    setEditor,
    setExtractChapterIndex,
    setFromChapter,
    setSearch,
    setToChapter,
    toChapter,
    updateDraft,
  };
}

export type StoryBibleController = ReturnType<typeof useStoryBible>;
