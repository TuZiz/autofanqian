export type SessionUser = {
  id: string;
  code: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  isAdmin?: boolean;
};

export type DashboardOverview = {
  stats: {
    totalWords: number;
    chapterCount: number;
    workCount: number;
  };
  activeWork: null | {
    id: string;
    title: string;
    tag: string;
    words: string | null;
    wordCount: number;
    completionPercent: number;
    updatedAt: string;
    chapter: {
      index: number;
      title: string | null;
      wordCount: number;
    };
  };
  works: Array<{
    id: string;
    title: string;
    tag: string;
    genreLabel: string;
    words: string | null;
    wordCount: number;
    chapterCount: number;
    completionPercent: number;
    updatedAt: string;
    owner: {
      id: string;
      code: number;
      email: string;
    };
    chapter: {
      index: number;
      title: string | null;
      wordCount: number;
    };
  }>;
};

export type DashboardWork = DashboardOverview["works"][number];
