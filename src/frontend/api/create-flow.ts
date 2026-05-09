import { apiRequest } from "@/lib/client/auth-api";
import type {
  CreateUiConfig,
  HotTemplate,
  IdeaAnalysis,
  SessionUser,
} from "@/lib/create/dashboard-create-types";

type GenerateIdeaResponse =
  | { success: true; data: { idea: string }; message?: string }
  | { success: false; message?: string; fieldErrors?: Record<string, string[]> };

type IdeaPayload = {
  genre: string;
  customGenreLabel?: string;
  tags: string[];
  platform?: string;
  dnaBookTitle?: string;
  words?: string;
};

export async function fetchCreateSession() {
  return apiRequest<{ user: SessionUser }>("/api/auth/session");
}

export async function fetchCreateConfig() {
  return apiRequest<{ config: CreateUiConfig }>("/api/config/create");
}

export async function fetchCreateTemplates(genreId: string) {
  return apiRequest<{ templates: HotTemplate[] }>(
    `/api/create/templates?genreId=${encodeURIComponent(genreId)}`,
  );
}

export async function markCreateTemplateUsed(templateId: string) {
  return apiRequest("/api/create/templates/use", { templateId });
}

export async function analyzeCreateIdea(payload: IdeaPayload & { idea: string }) {
  return apiRequest<{ analysis: IdeaAnalysis }>("/api/ai/idea/analyze", payload);
}

export async function generateCreateIdea(payload: IdeaPayload & { existingIdea: string }) {
  const response = await fetch("/api/ai/idea", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return (await response.json().catch(() => null)) as GenerateIdeaResponse | null;
}
