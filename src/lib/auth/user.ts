import type { Prisma } from "@prisma/client";

export const sessionUserSelect = {
  id: true,
  code: true,
  email: true,
  name: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{
  select: typeof sessionUserSelect;
}>;
