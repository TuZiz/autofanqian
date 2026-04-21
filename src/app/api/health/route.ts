import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", ms: Date.now() - startedAt });
  } catch {
    return Response.json(
      { ok: false, db: "down", ms: Date.now() - startedAt },
      { status: 503 }
    );
  }
}
