export type SessionUser = {
  id: string;
  email: string;
  isAdmin?: boolean;
};

export type GenreConfig = {
  id: string;
  name: string;
  tags: string[];
  icon: string;
  gradient: string;
  sortOrder: number;
  active: boolean;
};

export type OptionConfig = {
  id: string;
  label: string;
  promptHint?: string;
  sortOrder: number;
  active: boolean;
};

export type CreateUiConfig = {
  version: 1;
  genres: GenreConfig[];
  platforms: OptionConfig[];
  dnaStyles: OptionConfig[];
  wordOptions: OptionConfig[];
};

export type OptionSectionKey = "platforms" | "dnaStyles" | "wordOptions";

export type TemplateItem = {
  id: string;
  genreId: string;
  title: string | null;
  content: string;
  source: "seed" | "ai" | "user" | "learned";
  usageCount: number;
  isActive: boolean;
  updatedAt: string;
};

export type AiStats = {
  day: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  avgDurationMs: number | null;
  allTime: {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    avgDurationMs: number | null;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    byModel: Array<{
      modelUsed: string;
      calls: number;
      avgDurationMs: number | null;
      tokens: { input: number; output: number; total: number };
    }>;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  byModel: Array<{
    modelUsed: string;
    calls: number;
    avgDurationMs: number | null;
    tokens: { input: number; output: number; total: number };
  }>;
  byProvider: Array<{
    providerId: string;
    providerLabel?: string;
    calls: number;
    avgDurationMs: number | null;
    tokens: { input: number; output: number; total: number };
  }>;
  byAction: Array<{
    action: string;
    calls: number;
    avgDurationMs: number | null;
    tokens: { input: number; output: number; total: number };
  }>;
};
