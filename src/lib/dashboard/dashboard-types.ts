import type { SessionAccessFields } from "@/lib/auth/session-user-types";
import type { WorkLibraryTypeFilter, WorkTypeValue } from "@/shared/work-type";

export type SessionUser = SessionAccessFields & {
  id: string;
  code: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
};

export type DashboardOverview = {
  stats: {
    totalWords: number;
    chapterCount: number;
    workCount: number;
  };
  activeWork: null | {
    id: string;
    workType: WorkTypeValue;
    title: string;
    tag: string;
    words: string | null;
    targetChapters?: number | null;
    plannedUntilChapter?: number | null;
    wordCount: number;
    completionPercent: number;
    createdAt: string;
    updatedAt: string;
    chapter: {
      index: number;
      title: string | null;
      wordCount: number;
    };
  };
  works: Array<{
    id: string;
    workType: WorkTypeValue;
    title: string;
    tag: string;
    genreLabel: string;
    words: string | null;
    targetChapters?: number | null;
    plannedUntilChapter?: number | null;
    wordCount: number;
    chapterCount: number;
    completionPercent: number;
    updatedAt: string;
    owner: {
      id: string;
      code: number;
      email: string;
      name: string | null;
    };
    chapter: {
      index: number;
      title: string | null;
      wordCount: number;
    };
  }>;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

export type DashboardWork = DashboardOverview["works"][number];

export type DashboardSortKey =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc"
  | "word_desc"
  | "word_asc"
  | "progress_desc"
  | "progress_asc"
  | "title_asc"
  | "title_desc";

export type DashboardFilters = {
  q: string;
  genreId: string;
  tag: string;
  owner: string;
  type: WorkLibraryTypeFilter;
  sort: DashboardSortKey;
  page: number;
  pageSize: number;
};
