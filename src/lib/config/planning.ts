import "server-only";

import { z } from "zod";

import {
  DEFAULT_PLANNING_CONFIG,
  type PlanningWindowConfig,
} from "@/lib/create/progressive-planning";
import { prisma } from "@/lib/prisma";

export const PLANNING_CONFIG_KEY = "planning_window_v1";

const presetSchema = z.object({
  label: z.string().min(1).max(40),
  min: z.coerce.number().int().min(1).max(60),
  max: z.coerce.number().int().min(1).max(60),
});

const planningConfigSchema = z.object({
  version: z.literal(1),
  unlockThreshold: z.coerce.number().min(0.1).max(1),
  hardMaxChapters: z.coerce.number().int().min(1).max(60),
  presets: z.object({
    short: presetSchema,
    smart: presetSchema,
    long: presetSchema,
  }),
});

function normalizeConfig(input: z.infer<typeof planningConfigSchema>): PlanningWindowConfig {
  const hardMaxChapters = Math.min(60, Math.max(1, input.hardMaxChapters));
  const normalizePreset = (preset: z.infer<typeof presetSchema>) => {
    const max = Math.min(hardMaxChapters, Math.max(1, preset.max));
    const min = Math.min(max, Math.max(1, preset.min));
    return { label: preset.label, min, max };
  };

  return {
    version: 1,
    unlockThreshold: input.unlockThreshold,
    hardMaxChapters,
    presets: {
      short: normalizePreset(input.presets.short),
      smart: normalizePreset(input.presets.smart),
      long: normalizePreset(input.presets.long),
    },
  };
}

export async function getPlanningConfig() {
  const existing = await prisma.appConfig.findUnique({
    where: { key: PLANNING_CONFIG_KEY },
    select: { value: true },
  });

  if (!existing) {
    await prisma.appConfig.create({
      data: {
        key: PLANNING_CONFIG_KEY,
        value: DEFAULT_PLANNING_CONFIG,
      },
    });
    return DEFAULT_PLANNING_CONFIG;
  }

  const parsed = planningConfigSchema.safeParse(existing.value);
  if (!parsed.success) return DEFAULT_PLANNING_CONFIG;
  return normalizeConfig(parsed.data);
}

export async function updatePlanningConfig(nextConfig: unknown) {
  const parsed = planningConfigSchema.parse(nextConfig);
  const normalized = normalizeConfig(parsed);

  await prisma.appConfig.upsert({
    where: { key: PLANNING_CONFIG_KEY },
    create: { key: PLANNING_CONFIG_KEY, value: normalized },
    update: { value: normalized },
  });

  return normalized;
}
