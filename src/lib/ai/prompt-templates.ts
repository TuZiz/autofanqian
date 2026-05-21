import "server-only";

import { prisma } from "@/lib/prisma";
import { getAiActionAliases } from "@/shared/ai-actions";

export type ActivePromptTemplate = {
  content: string;
  key: string;
  version: number;
};

export async function getActivePromptTemplate(
  key: string,
  fallback: string,
): Promise<ActivePromptTemplate> {
  const keys = getAiActionAliases(key);
  const template = await prisma.promptTemplate.findFirst({
    where: { key: { in: keys }, isActive: true },
    orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
    select: { key: true, content: true, version: true },
  });

  if (!template) {
    return { key, content: fallback, version: 0 };
  }

  return template;
}
