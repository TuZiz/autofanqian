import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.SESSION_SECRET ??= "test-session-secret-for-route-origin-test";

const { POST } = await import("../src/app/api/auth/login/route.ts");

test("/api/auth/login rejects cross-site POST with standard 403 JSON", async () => {
  const response = await POST(
    new Request("https://app.example.test/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "app.example.test",
        origin: "https://evil.example.test",
      },
      body: JSON.stringify({
        email: "user@example.test",
        password: "password123",
      }),
    }),
  );

  assert.equal(response.status, 403);
  const payload = await response.json();
  assert.equal(payload.success, false);
  assert.equal(typeof payload.message, "string");
  assert.ok(payload.message.length > 0);
});
