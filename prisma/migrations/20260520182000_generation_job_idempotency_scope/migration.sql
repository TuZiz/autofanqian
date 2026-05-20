-- Scope GenerationJob idempotency to user + action instead of a global key.

DROP INDEX IF EXISTS "GenerationJob_idempotencyKey_key";

CREATE UNIQUE INDEX "GenerationJob_userId_action_idempotencyKey_key"
  ON "GenerationJob"("userId", "action", "idempotencyKey");