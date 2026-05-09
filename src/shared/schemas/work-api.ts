import { z } from "zod";

import { storyOutlineSchema } from "@/lib/create/outline-schema";

export const workDraftSchema = z.object({
  genre: z.string().min(1).max(64),
  genreLabel: z.string().max(64).optional(),
  idea: z.string().min(10).max(2000),
  tags: z.array(z.string().min(1).max(24)).max(12).optional(),
  platform: z.string().max(64).optional(),
  platformLabel: z.string().max(64).optional(),
  dnaBookTitle: z.string().max(120).optional(),
  words: z.string().max(40).optional(),
});

export const workCreateBodySchema = z.object({
  draft: workDraftSchema,
  story: storyOutlineSchema,
});

export const workListSortSchema = z.enum([
  "updated_desc",
  "updated_asc",
  "created_desc",
  "created_asc",
  "word_desc",
  "word_asc",
  "progress_desc",
  "progress_asc",
  "title_asc",
  "title_desc",
]);

export const workListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  genreId: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  owner: z.string().trim().max(200).optional(),
  sort: workListSortSchema.default("updated_desc"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(80),
});

export type WorkCreateBody = z.infer<typeof workCreateBodySchema>;
export type WorkListQuery = z.infer<typeof workListQuerySchema>;
export type WorkListSort = z.infer<typeof workListSortSchema>;
