export type ForeshadowingItem = {
  id: string;
  title: string | null;
  hint: string;
  payoff: string | null;
  status: string;
  importance: number;
  plantedChapter: number | null;
  resolvedChapter: number | null;
  updatedAt: string;
};

export type SettingItem = {
  id: string;
  kind: string;
  name: string;
  desc: string;
  firstChapter: number | null;
  lastUpdatedChapter: number | null;
  updatedAt: string;
};

export type TimelineItem = {
  id: string;
  title: string | null;
  description: string | null;
  summary: string;
  storyTime: string | null;
  chapterIndex: number | null;
  order: number;
  canonical: boolean;
  updatedAt: string;
};

export type ContextEditorState =
  | {
      kind: "foreshadowing";
      id: string;
      draft: Record<string, string>;
    }
  | {
      kind: "setting";
      id: string;
      draft: Record<string, string>;
    }
  | {
      kind: "timeline";
      id: string;
      draft: Record<string, string>;
    };
