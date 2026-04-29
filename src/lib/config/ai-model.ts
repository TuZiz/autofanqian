import "server-only";

import { z } from "zod";

import {
  AI_MODEL_CONFIG_KEYS,
  AI_MODEL_PROVIDER_IDS,
  type AiModelConfig,
  type AiModelConfigKey,
  type AiModelProviderId,
  type AiModelTarget,
} from "@/lib/admin/ai-model-types";
import { getDefaultAiModelConfig } from "@/lib/admin/ai-model-utils";
import { prisma } from "@/lib/prisma";

export const AI_MODEL_CONFIG_KEY = "ai_model_v1";

const providerIdSchema = z.enum(AI_MODEL_PROVIDER_IDS);

const targetSchema = z.object({
  providerId: providerIdSchema,
  // Optional model override. When null/undefined, uses provider's env default.
  model: z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? null : value),
    z.string().trim().min(1).max(160).optional().nullable(),
  ),
});

const aiModelConfigSchema = z.object({
  version: z.literal(1),
  ideaGenerate: targetSchema.optional(),
  ideaAnalyze: targetSchema.optional(),
  outlineGenerate: targetSchema.optional(),
  chapterGenerate: targetSchema.optional(),
  chapterSummary: targetSchema.optional(),
  chapterOutline: targetSchema.optional(),
  chapterDetails: targetSchema.optional(),
  templatesLearn: targetSchema.optional(),
  regenerateAll: targetSchema.optional(),
});

function normalizeTarget(candidate: AiModelTarget | undefined, fallback: AiModelTarget) {
  const providerId: AiModelProviderId = candidate?.providerId ?? fallback.providerId;
  const model = candidate?.model?.trim() || null;
  return { providerId, model };
}

function normalizeParsedConfig(
  data: z.infer<typeof aiModelConfigSchema>,
): AiModelConfig {
  const defaults = getDefaultAiModelConfig();
  const normalized = { version: 1 } as AiModelConfig;
  const targets = data as Partial<Record<AiModelConfigKey, AiModelTarget>>;

  for (const key of AI_MODEL_CONFIG_KEYS) {
    normalized[key] = normalizeTarget(targets[key], defaults[key]);
  }

  return normalized;
}

export async function getAiModelConfig() {
  const existing = await prisma.appConfig.findUnique({
    where: { key: AI_MODEL_CONFIG_KEY },
    select: { value: true },
  });

  if (!existing) {
    const seeded = getDefaultAiModelConfig();
    await prisma.appConfig.create({
      data: {
        key: AI_MODEL_CONFIG_KEY,
        value: seeded,
      },
    });
    return seeded;
  }

  const parsed = aiModelConfigSchema.safeParse(existing.value);
  if (!parsed.success) {
    return getDefaultAiModelConfig();
  }

  return normalizeParsedConfig(parsed.data);
}

export async function updateAiModelConfig(nextConfig: unknown) {
  const parsed = aiModelConfigSchema.parse(nextConfig);
  const normalized = normalizeParsedConfig(parsed);

  await prisma.appConfig.upsert({
    where: { key: AI_MODEL_CONFIG_KEY },
    create: { key: AI_MODEL_CONFIG_KEY, value: normalized },
    update: { value: normalized },
  });

  return normalized;
}
