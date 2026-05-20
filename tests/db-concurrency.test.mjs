import assert from "node:assert/strict";
import test from "node:test";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
    log: ["error"],
  });
}

function requireTestDatabase(context) {
  if (!testDatabaseUrl) {
    context.skip("set TEST_DATABASE_URL to run database concurrency tests");
    return null;
  }

  if (!/test|ci/i.test(testDatabaseUrl)) {
    context.skip("TEST_DATABASE_URL must contain test or ci");
    return null;
  }

  return createPrismaClient();
}

async function cleanup(prisma, prefix) {
  await prisma.generationJob.deleteMany({
    where: { OR: [{ userId: { startsWith: prefix } }, { novelId: { startsWith: prefix } }] },
  });
  await prisma.aiQuotaReservation.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.aiUsageCounter.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.aiUsageEvent.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.work.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.user.deleteMany({
    where: { id: { startsWith: prefix } },
  });
}

async function createTestUserAndWork(prisma, prefix) {
  const user = await prisma.user.create({
    data: {
      id: `${prefix}-user`,
      email: `${prefix}@example.test`,
      emailVerified: true,
      membershipTier: "default",
      role: "user",
      status: "active",
    },
  });

  const work = await prisma.work.create({
    data: {
      id: `${prefix}-work`,
      userId: user.id,
      workType: "long_novel",
      genreId: "test-genre",
      genreLabel: "Test",
      idea: "test idea",
      tags: ["test"],
      tag: "test",
      title: "Test Work",
      synopsis: "test synopsis",
      outline: {
        title: "Test Work",
        volumes: [
          {
            name: "Volume 1",
            summary: "test volume",
            startChapter: 1,
            endChapter: 1,
          },
        ],
      },
      plannedUntilChapter: 1,
      planningMode: "progressive",
    },
  });

  return { user, work };
}

test("GenerationJob enforces concurrent active chapter jobs in the database", async (context) => {
  const prisma = requireTestDatabase(context);
  if (!prisma) return;

  const prefix = `itest-gen-${Date.now()}`;
  try {
    await cleanup(prisma, prefix);
    const { user, work } = await createTestUserAndWork(prisma, prefix);
    const activeLockKey = `${user.id}:${work.id}:1:none`;

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        prisma.generationJob.create({
          data: {
            id: `${prefix}-job-${index}`,
            userId: user.id,
            novelId: work.id,
            workId: work.id,
            chapterIndex: 1,
            action: "chapter.generate",
            jobType: "chapter.generate",
            status: "running",
            activeLockKey,
            idempotencyKey: `${prefix}-job-key-${index}`,
            startedAt: new Date(),
            heartbeatAt: new Date(),
          },
        }),
      ),
    );

    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter((result) => result.status === "rejected");
    const activeJobs = await prisma.generationJob.count({
      where: {
        userId: user.id,
        novelId: work.id,
        chapterIndex: 1,
        status: { in: ["queued", "running"] },
      },
    });

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 7);
    assert.equal(activeJobs, 1);
  } finally {
    await cleanup(prisma, prefix);
    await prisma.$disconnect();
  }
});

test("AiQuotaReservation reuses one idempotency key under concurrent writes", async (context) => {
  const prisma = requireTestDatabase(context);
  if (!prisma) return;

  const prefix = `itest-quota-${Date.now()}`;
  try {
    await cleanup(prisma, prefix);
    const { user } = await createTestUserAndWork(prisma, prefix);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const idempotencyKey = `${prefix}-idem-key`;

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        prisma.aiQuotaReservation.create({
          data: {
            id: `${prefix}-reservation-${index}`,
            userId: user.id,
            action: "chapter_generate",
            status: "pending",
            idempotencyKey,
            estimatedTokens: 100,
            estimatedOutputChars: 1000,
            expiresAt,
          },
        }),
      ),
    );

    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter((result) => result.status === "rejected");
    const reservations = await prisma.aiQuotaReservation.findMany({
      where: { userId: user.id, action: "chapter_generate", idempotencyKey },
    });

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 7);
    assert.equal(reservations.length, 1);
    assert.equal(reservations[0].status, "pending");
  } finally {
    await cleanup(prisma, prefix);
    await prisma.$disconnect();
  }
});
