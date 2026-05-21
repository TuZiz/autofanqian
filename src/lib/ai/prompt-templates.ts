import "server-only";

import { prisma } from "@/lib/prisma";

export type ActivePromptTemplate = {
  content: string;
  key: string;
  version: number;
};

export async function getActivePromptTemplate(
  key: string,
  fallback: string,
): Promise<ActivePromptTemplate> {
  const template = await prisma.promptTemplate.findFirst({
    where: { key, isActive: true },
    orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
    select: { key: true, content: true, version: true },
  });

  if (!template) {
    return { key, content: fallback, version: 0 };
  }

  return template;
}
