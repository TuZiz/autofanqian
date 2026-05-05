import type { SessionAccessFields } from "@/lib/auth/session-user-types";

export type SessionUser = SessionAccessFields & {
  id: string;
  email: string;
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

export type PlanningPresetConfig = {
  label: string;
  min: number;
  max: number;
};

export type PlanningWindowConfig = {
  version: 1;
  unlockThreshold: number;
  hardMaxChapters: number;
  presets: {
    short: PlanningPresetConfig;
    smart: PlanningPresetConfig;
    long: PlanningPresetConfig;
  };
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

export type AdminAuditLogItem = {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};
