import {
  MIN_CUSTOM_DETAIL_LENGTH,
  MIN_CUSTOM_GENRE_NAME,
  MIN_CUSTOM_TAG_COUNT,
  MIN_IDEA_LENGTH_FOR_AI,
  MIN_IDEA_LENGTH_FOR_OUTLINE,
} from "./dashboard-create-rules";
import type { CreateUiConfig, Genre, GenreId } from "./dashboard-create-types";
import { CUSTOM_GENRE_ID, parseTagInput } from "./dashboard-create-utils";

export function getCustomGenreValidationMessage(params: {
  isCustomGenre: boolean;
  normalizedCustomGenreLabel: string;
  customTags: string[];
  trimmedCustomWorldDetails: string;
}) {
  if (!params.isCustomGenre) return "";

  if (params.normalizedCustomGenreLabel.length < MIN_CUSTOM_GENRE_NAME) {
    return "请先写清自定义题材名称。";
  }

  if (params.customTags.length < MIN_CUSTOM_TAG_COUNT) {
    return `自定义模式至少需要 ${MIN_CUSTOM_TAG_COUNT} 个核心标签。`;
  }

  if (params.trimmedCustomWorldDetails.length < MIN_CUSTOM_DETAIL_LENGTH) {
    return "请再补充一句话设定，让系统更准确理解你的故事方向。";
  }

  return "";
}

export function isCustomGenreReady(params: {
  genreLabel: string;
  tagsInput: string;
  details: string;
}) {
  return (
    params.genreLabel.trim().length >= MIN_CUSTOM_GENRE_NAME &&
    parseTagInput(params.tagsInput).length >= MIN_CUSTOM_TAG_COUNT &&
    params.details.trim().length >= MIN_CUSTOM_DETAIL_LENGTH
  );
}

export function getSelectedTags(params: {
  config: CreateUiConfig | null;
  customTags: string[];
  selectedGenre: GenreId | "";
}) {
  if (!params.selectedGenre || !params.config) return [];
  if (params.selectedGenre === CUSTOM_GENRE_ID && params.customTags.length) {
    return params.customTags;
  }
  return params.config.genres.find((item) => item.id === params.selectedGenre)?.tags ?? [];
}

export function getCustomDetails(params: {
  isCustomGenre: boolean;
  normalizedCustomGenreLabel: string;
  customTags: string[];
  trimmedCustomWorldDetails: string;
}) {
  if (!params.isCustomGenre) return undefined;

  return [
    params.normalizedCustomGenreLabel
      ? `自定义题材：${params.normalizedCustomGenreLabel}`
      : "",
    params.customTags.length ? `核心标签：${params.customTags.join("、")}` : "",
    params.trimmedCustomWorldDetails
      ? `一句话设定：${params.trimmedCustomWorldDetails}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getEffectiveIdeaForAi(params: {
  isCustomGenre: boolean;
  customDetails?: string;
  trimmedIdea: string;
}) {
  return params.isCustomGenre && params.customDetails
    ? `${params.trimmedIdea}\n\n【自定义补充设定】\n${params.customDetails}`
    : params.trimmedIdea;
}

export function getEffectiveGenreLabel(params: {
  customGenre?: Genre;
  genres: Genre[];
  isCustomGenre: boolean;
  normalizedCustomGenreLabel: string;
  selectedGenre: GenreId | "";
}) {
  return params.isCustomGenre
    ? params.normalizedCustomGenreLabel || params.customGenre?.name || "自定义"
    : params.genres.find((item) => item.id === params.selectedGenre)?.name;
}

export function getSubmitBlockedReason(params: {
  customGenreValidationMessage: string;
  platform: string;
  selectedGenre: GenreId | "";
  trimmedIdeaLength: number;
  words: string;
}) {
  if (!params.selectedGenre) {
    return "请先选择创作方向，再生成大纲。";
  }

  if (!params.platform.trim() || !params.words.trim()) {
    return "字数和平台必须选择才能生成大纲。";
  }

  if (params.trimmedIdeaLength < MIN_IDEA_LENGTH_FOR_OUTLINE) {
    return `请补充至少 ${MIN_IDEA_LENGTH_FOR_OUTLINE} 个字的故事创意。`;
  }

  return params.customGenreValidationMessage;
}

export function getCreateAvailability(params: {
  customGenreValidationMessage: string;
  isCustomGenre: boolean;
  platform: string;
  selectedGenre: GenreId | "";
  trimmedIdeaLength: number;
  words: string;
}) {
  const canGenerateFromBlueprint = params.isCustomGenre && !params.customGenreValidationMessage;
  const hasPlatform = Boolean(params.platform.trim());
  const hasWords = Boolean(params.words.trim());

  return {
    canAnalyzeIdea:
      Boolean(params.selectedGenre) && params.trimmedIdeaLength >= MIN_IDEA_LENGTH_FOR_AI,
    canGenerateAi:
      Boolean(params.selectedGenre) &&
      (params.trimmedIdeaLength >= MIN_IDEA_LENGTH_FOR_AI || canGenerateFromBlueprint),
    canSubmitOutline:
      Boolean(params.selectedGenre) &&
      hasPlatform &&
      hasWords &&
      params.trimmedIdeaLength >= MIN_IDEA_LENGTH_FOR_OUTLINE &&
      (!params.isCustomGenre || !params.customGenreValidationMessage),
    outlineIdeaRemaining: Math.max(
      0,
      MIN_IDEA_LENGTH_FOR_OUTLINE - params.trimmedIdeaLength,
    ),
  };
}
