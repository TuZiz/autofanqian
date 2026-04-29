export type GenreId = string;

export type Genre = {
  id: GenreId;
  name: string;
  tags: string[];
  gradient: string;
  icon: string;
};

export type SessionUser = {
  email: string;
  isAdmin?: boolean;
};

export type CreateSelectOption = {
  id: string;
  label: string;
  promptHint?: string;
};

export type CreateUiConfig = {
  genres: Genre[];
  platforms: CreateSelectOption[];
  dnaStyles: CreateSelectOption[];
  wordOptions: CreateSelectOption[];
};

export type HotTemplate = {
  id: string;
  content: string;
};

export type IdeaAnalysis = {
  oneLinePitch: string;
  recommendedTitles: string[];
  keyPhrases: string[];
  coreSellingPoints: string[];
  targetReaders: string;
};
