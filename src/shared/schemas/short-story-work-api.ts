import { z } from "zod";

import { shortStoryOutlineSchema } from "@/lib/create/short-story-outline-schema";
import { shortStoryInputSchema } from "@/shared/schemas/short-story";

export const shortStoryWorkCreateBodySchema = z.object({
  input: shortStoryInputSchema,
  outline: shortStoryOutlineSchema,
});

export type ShortStoryWorkCreateBody = z.infer<
  typeof shortStoryWorkCreateBodySchema
>;
