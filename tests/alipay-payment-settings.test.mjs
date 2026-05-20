import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const rootDir = process.cwd();
const alipayConfigModule = await import("../src/lib/payments/alipay-config.ts");
const {
  ALIPAY_ENCRYPTION_KEY_ERROR,
  getAlipayPaymentConfig,
  getSafeAlipayPaymentConfig,
  updateAlipayPaymentConfig,
} = alipayConfigModule;

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

function makeStore(initialValue = null) {
  let value = initialValue;

  return {
    get value() {
      return value;
    },
    async findUnique() {
      return value ? { value } : null;
    },
    async upsert(nextValue) {
      value = nextValue;
    },
  };
}

function makeInput(overrides = {}) {
  return {
    enabled: true,
    sandbox: true,
    appId: " 2021003191677063 ",
    gateway: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
    returnUrl: "https://example.com/payments/alipay/return",
    notifyUrl: "https://example.com/api/payments/alipay/notify",
    signType: "RSA2",
    alipayPublicKey: "PUBLIC_KEY_FOR_TEST",
    ...overrides,
  };
}

test("saving privateKey without SETTINGS_ENCRYPTION_KEY returns a clear error", async () => {
  const previousKey = process.env.SETTINGS_ENCRYPTION_KEY;
  delete process.env.SETTINGS_ENCRYPTION_KEY;

  await assert.rejects(
    () => updateAlipayPaymentConfig(makeInput({ privateKey: "PRIVATE_KEY_FOR_TEST" }), makeStore()),
    (error) => error?.status === 500 && error?.message === ALIPAY_ENCRYPTION_KEY_ERROR,
  );

  if (previousKey === undefined) {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  } else {
    process.env.SETTINGS_ENCRYPTION_KEY = previousKey;
  }
});

test("privateKey is encrypted in AppConfig and safe config never returns it", async () => {
  const previousKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
  const store = makeStore();
  const privateKey = "PRIVATE_KEY_SHOULD_NOT_BE_PLAINTEXT";

  await updateAlipayPaymentConfig(makeInput({ privateKey }), store);

  const serialized = JSON.stringify(store.value);
  assert.doesNotMatch(serialized, new RegExp(privateKey));
  assert.match(serialized, /encryptedPrivateKey/);
  assert.equal(store.value.appId, "2021003191677063");

  const safe = await getSafeAlipayPaymentConfig(store);
  assert.equal(safe.privateKeyConfigured, true);
  assert.equal(Object.hasOwn(safe, "privateKey"), false);
  assert.equal(Object.hasOwn(safe, "encryptedPrivateKey"), false);
  assert.equal(safe.alipayPublicKeyConfigured, true);

  if (previousKey === undefined) {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  } else {
    process.env.SETTINGS_ENCRYPTION_KEY = previousKey;
  }
});

test("PATCH without privateKey preserves old encrypted secret", async () => {
  const previousKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
  const store = makeStore();

  await updateAlipayPaymentConfig(makeInput({ privateKey: "FIRST_PRIVATE_KEY" }), store);
  const firstSecret = store.value.encryptedPrivateKey;
  await updateAlipayPaymentConfig(makeInput({ enabled: false, appId: "2021003191677063" }), store);

  assert.deepEqual(store.value.encryptedPrivateKey, firstSecret);
  assert.equal(store.value.enabled, false);

  if (previousKey === undefined) {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  } else {
    process.env.SETTINGS_ENCRYPTION_KEY = previousKey;
  }
});

test('PATCH privateKey="__CLEAR__" clears old encrypted secret', async () => {
  const previousKey = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
  const store = makeStore();

  await updateAlipayPaymentConfig(makeInput({ privateKey: "FIRST_PRIVATE_KEY" }), store);
  await updateAlipayPaymentConfig(makeInput({ privateKey: "__CLEAR__" }), store);

  assert.equal(store.value.encryptedPrivateKey, undefined);
  const safe = await getSafeAlipayPaymentConfig(store);
  assert.equal(safe.privateKeyConfigured, false);

  if (previousKey === undefined) {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  } else {
    process.env.SETTINGS_ENCRYPTION_KEY = previousKey;
  }
});

test("getAlipayPaymentConfig falls back to disabled default when storage read fails", async () => {
  const config = await getAlipayPaymentConfig({
    async findUnique() {
      throw new Error("database failed");
    },
    async upsert() {
      throw new Error("unused");
    },
  });

  assert.equal(config.version, 1);
  assert.equal(config.enabled, false);
  assert.equal(config.signType, "RSA2");
});

test("admin Alipay API protects payment settings and returns safe config only", () => {
  const routeSource = read("src/app/api/admin/payments/alipay/route.ts");

  assert.match(routeSource, /assertSameOriginRequest\(request\);/);
  assert.match(routeSource, /isSuperAdminUser\(adminUser\)/);
  assert.match(routeSource, /只有根管理员或超级管理员可以管理支付设置/);
  assert.match(routeSource, /getSafeAlipayPaymentConfig\(\)/);
  assert.match(routeSource, /toSafeAlipayPaymentConfig\(config\)/);
  assert.doesNotMatch(routeSource, /successResponse\(\{[^}]*privateKey/);
  assert.doesNotMatch(routeSource, /successResponse\(\{[^}]*encryptedPrivateKey/);

  const authSource = read("src/lib/auth/admin.ts");
  assert.match(authSource, /export function isSuperAdminUser/);
});

test("admin payment UI never pre-fills saved private key", () => {
  const uiSource = read("src/components/admin/admin-payment-settings.tsx");
  const hookSource = read("src/lib/admin/use-alipay-payment-settings.ts");

  assert.match(uiSource, /应用私钥：已安全保存/);
  assert.match(uiSource, /不会回显已保存私钥/);
  assert.match(hookSource, /privateKeyInput: ""/);
  assert.match(hookSource, /privateKey: "__CLEAR__"/);
});
