import {
  SHORT_STORY_ENDING_LABELS,
  type ShortStoryEndingType,
} from "@/shared/schemas/short-story";

const STRUCTURE_LABELS: Record<string, string> = {
  "三幕式": "三幕式",
  "反转式": "反转式",
  "悬疑式": "悬疑式",
  "爽文式": "爽文式",
  "虐恋式": "虐恋式",
  "治愈式": "治愈式",
};

const STYLE_LABELS: Record<string, string> = {
  "番茄": "番茄",
  "晋江": "晋江",
  "小红书": "小红书",
  "短剧": "短剧",
  "知乎故事": "知乎故事",
  "轻小说": "轻小说",
};

const POV_LABELS: Record<string, string> = {
  "第一人称": "第一人称",
  "第三人称": "第三人称",
  "多视角": "多视角",
};

export function getShortStoryStructureLabel(value: string) {
  return STRUCTURE_LABELS[value] ?? value;
}

export function getShortStoryStyleLabel(value: string) {
  return STYLE_LABELS[value] ?? value;
}

export function getShortStoryPovLabel(value: string) {
  return POV_LABELS[value] ?? value;
}

export function getShortStoryEndingLabel(value: ShortStoryEndingType) {
  return SHORT_STORY_ENDING_LABELS[value] ?? value;
}
