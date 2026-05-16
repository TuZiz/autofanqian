import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSameOriginRequest,
} from "../src/lib/security/origin.ts";
import { AuthApiError } from "../src/lib/auth/errors.ts";

const ORIGINAL_ENV = {
  APP_BASE_URL: process.env.APP_BASE_URL,
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
  NODE_ENV: process.env.NODE_ENV,
};

function resetOriginEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function makeRequest(headers) {
  return new Request("https://app.example.test/api/test", {
    method: "POST",
    headers,
  });
}

function assertForbiddenOrigin(fn) {
  assert.throws(
    fn,
    (error) =>
      error instanceof AuthApiError &&
      error.status === 403 &&
      typeof error.message === "string" &&
      error.message.length > 0,
  );
}

test.after(resetOriginEnv);

test("same-origin Origin passes", () => {
  resetOriginEnv();

  assert.doesNotThrow(() =>
    assertSameOriginRequest(
      makeRequest({
        host: "app.example.test",
        origin: "https://app.example.test",
      }),
    ),
  );
});

test("TRUSTED_ORIGINS passes", () => {
  resetOriginEnv();
  process.env.TRUSTED_ORIGINS = "https://trusted.example.test";

  assert.doesNotThrow(() =>
    assertSameOriginRequest(
      makeRequest({
        host: "app.example.test",
        origin: "https://trusted.example.test",
      }),
    ),
  );
});

test("cross-site Origin throws AuthApiError 403", () => {
  resetOriginEnv();

  assertForbiddenOrigin(() =>
    assertSameOriginRequest(
      makeRequest({
        host: "app.example.test",
        origin: "https://evil.example.test",
      }),
    ),
  );
});

test("missing Origin throws AuthApiError 403", () => {
  resetOriginEnv();

  assertForbiddenOrigin(() =>
    assertSameOriginRequest(
      makeRequest({
        host: "app.example.test",
      }),
    ),
  );
});
