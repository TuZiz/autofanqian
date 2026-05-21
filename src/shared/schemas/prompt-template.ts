import { z } from "zod";

export const promptTemplateCategorySchema = z.enum([
  "idea",
  "outline",
  "chapter",
  "context",
  "template",
  "regenerate",
]);

export const promptTemplateListQuerySchema = z.object({
  category: promptTemplateCategorySchema.optional(),
});

export const promptTemplateCreateSchema = z.object({
  key: z.string().trim().min(2).max(120),
  category: promptTemplateCategorySchema,
  name: z.string().trim().min(1).max(120),
  content: z.string().trim().min(10).max(30_000),
  isActive: z.boolean().optional().default(true),
});

export const promptTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(10).max(30_000).optional(),
  isActive: z.boolean().optional(),
  createVersion: z.boolean().optional().default(false),
});

export type PromptTemplateCategory = z.infer<typeof promptTemplateCategorySchema>;
export type PromptTemplateCreateInput = z.infer<typeof promptTemplateCreateSchema>;
export type PromptTemplateUpdateInput = z.infer<typeof promptTemplateUpdateSchema>;
