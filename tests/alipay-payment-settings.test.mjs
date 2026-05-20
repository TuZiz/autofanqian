import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const rootDir = process.cwd();
const alipayConfigModule = await import("../src/lib/payments/alipay-config.ts");
const {
  ALIPAY_PUBLIC_KEY_CLEAR_VALUE,
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

test('PATCH alipayPublicKey="__CLEAR__" clears saved public key', async () => {
  const store = makeStore();

  await updateAlipayPaymentConfig(makeInput({ alipayPublicKey: "PUBLIC_KEY_FOR_TEST" }), store);
  await updateAlipayPaymentConfig(makeInput({ alipayPublicKey: ALIPAY_PUBLIC_KEY_CLEAR_VALUE }), store);

  assert.equal(store.value.alipayPublicKey, "");
  const safe = await getSafeAlipayPaymentConfig(store);
  assert.equal(safe.alipayPublicKeyConfigured, false);
  assert.equal(safe.alipayPublicKeyPreview, null);
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
  assert.match(uiSource, /清空已保存支付宝公钥/);
  assert.match(uiSource, /不会回显已保存私钥/);
  assert.match(hookSource, /clearPublicKey: false/);
  assert.match(hookSource, /alipayPublicKey: "__CLEAR__"/);
  assert.match(hookSource, /privateKeyInput: ""/);
  assert.match(hookSource, /privateKey: "__CLEAR__"/);
});

test("payment plans are server-side and max is not purchasable online", () => {
  const plansSource = read("src/lib/payments/plans.ts");
  const createRouteSource = read("src/app/api/payments/alipay/create/route.ts");
  const upgradeSource = read("src/components/dashboard/dashboard-upgrade-modal.tsx");

  assert.match(plansSource, /plus_day:[\s\S]*amountCents: 500/);
  assert.match(plansSource, /plus_month:[\s\S]*amountCents: 1900/);
  assert.match(plansSource, /pro_month:[\s\S]*amountCents: 4900/);
  assert.doesNotMatch(plansSource, /max_month|max_year/);
  assert.match(createRouteSource, /getPaymentPlan\(body\.planId\)/);
  assert.doesNotMatch(createRouteSource, /amountCents:\s*body|amount:\s*body|price:\s*body/);
  assert.match(upgradeSource, /planId: "plus_day"/);
  assert.match(upgradeSource, /planId: "plus_month"/);
  assert.match(upgradeSource, /planId: "pro_month"/);
  assert.match(upgradeSource, /联系购买/);
});

test("payment order schema tracks provider status and membership expiry", () => {
  const schemaSource = read("prisma/schema.prisma");

  assert.match(schemaSource, /enum PaymentProvider \{[\s\S]*alipay[\s\S]*\}/);
  assert.match(schemaSource, /enum PaymentOrderStatus \{[\s\S]*pending[\s\S]*paid[\s\S]*closed[\s\S]*failed[\s\S]*refunded[\s\S]*\}/);
  assert.match(schemaSource, /membershipExpiresAt DateTime\?/);
  assert.match(schemaSource, /model PaymentOrder \{/);
  assert.match(schemaSource, /outTradeNo\s+String\s+@unique/);
  assert.match(schemaSource, /user User @relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)/);
});

test("create payment route requires login, same-origin and server-side plan lookup", () => {
  const createRouteSource = read("src/app/api/payments/alipay/create/route.ts");

  assert.match(createRouteSource, /assertSameOriginRequest\(request\);/);
  assert.match(createRouteSource, /getCurrentUser\(\)/);
  assert.match(createRouteSource, /new AuthApiError\(401/);
  assert.match(createRouteSource, /new AuthApiError\(400, "无效的支付套餐。"\)/);
  assert.match(createRouteSource, /prisma\.paymentOrder\.create/);
  assert.match(createRouteSource, /createAlipayPagePayUrl/);
});

test("notify route does not require login or same-origin and returns plain text failure on unsafe states", () => {
  const notifySource = read("src/app/api/payments/alipay/notify/route.ts");

  assert.doesNotMatch(notifySource, /getCurrentUser|requireAdminUser|assertSameOriginRequest/);
  assert.match(notifySource, /verifyAlipayNotify\(params\)/);
  assert.match(notifySource, /return textResponse\("failure"\)/);
  assert.match(notifySource, /TRADE_SUCCESS/);
  assert.match(notifySource, /TRADE_FINISHED/);
  assert.match(notifySource, /applyPaidAlipayOrder/);
});

test("notify paid handler validates amount and is idempotent before extending membership", () => {
  const orderSource = read("src/lib/payments/orders.ts");

  assert.match(orderSource, /paidAmountCents !== order\.amountCents/);
  assert.match(orderSource, /if \(order\.status === "paid"\)/);
  assert.match(orderSource, /if \(lockedOrder\.status === "paid"\)/);
  assert.match(orderSource, /updateMany\(\{[\s\S]*status: "pending"/);
  assert.match(orderSource, /claimed\.count === 0/);
  assert.match(orderSource, /membershipExpiresAt[\s\S]*addDays/);
  assert.match(orderSource, /membershipTier: lockedOrder\.tier/);
  assert.match(orderSource, /status: "paid"/);
});

test("return_url only verifies and redirects without granting membership", () => {
  const returnSource = read("src/app/api/payments/alipay/return/route.ts");

  assert.match(returnSource, /verifyAlipayNotify\(params\)/);
  assert.match(returnSource, /payment", verified \? "success" : "pending"/);
  assert.doesNotMatch(returnSource, /paymentOrder\.update|user\.update|applyPaidAlipayOrder|membershipTier|membershipExpiresAt/);
});
