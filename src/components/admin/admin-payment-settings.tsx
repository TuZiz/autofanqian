"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";

import { AppButton, AppCard } from "@/components/app-ui";
import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import type { AlipayPaymentSettingsController } from "@/lib/admin/use-alipay-payment-settings";
import { cn } from "@/lib/utils";

type AdminPaymentSettingsProps = {
  payment: AlipayPaymentSettingsController;
};

export function AdminPaymentSettings({ payment }: AdminPaymentSettingsProps) {
  if (payment.loading) {
    return <AdminStateScreen message="正在加载支付设置..." />;
  }

  return (
    <main className="app-work-surface relative min-h-dvh overflow-x-hidden pb-6 font-sans transition-[background-color,color]">
      <div className="pointer-events-none fixed inset-0 theme-app-surface" />

      <DashboardTopbar
        className="relative z-40"
        title="支付设置"
        userEmail={payment.user?.email ?? ""}
        isAdmin={payment.user?.isAdmin}
        showBackToDashboard
        backHref="/dashboard/admin"
        backLabel="返回管理台"
        showAdminLink={false}
        logoutLabel="退出"
        maxWidthClassName="max-w-[1320px]"
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 pt-4 sm:px-5 lg:px-6">
        <AppCard className="mb-3 overflow-hidden bg-[var(--theme-surface-strong)]">
          <div className="grid gap-3 border-b border-[var(--theme-border)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)] ring-1 ring-[var(--theme-brand-border)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]">
                  Payment Settings
                </div>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--theme-text-strong)] sm:text-2xl">
                  支付设置
                </h1>
                <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-[var(--theme-text-secondary)] sm:text-sm">
                  支付宝参数保存在后台配置中；应用私钥只会加密存入 AppConfig，不会回显到前端。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              <Link
                href="/dashboard/admin"
                className="theme-button-secondary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                返回管理台
              </Link>
              <AppButton
                type="button"
                onClick={payment.handleSave}
                isDisabled={payment.saving || !payment.canManagePayments}
                className="h-9 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                <Save className="h-4 w-4" />
                {payment.saving ? "保存中..." : "保存设置"}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AppCard className="overflow-hidden bg-[var(--theme-surface-strong)]">
            <div className="border-b border-[var(--theme-border)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--theme-text-strong)]">
                    支付宝支付
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">
                    修改后会影响后续会员下单，已创建订单不在本轮处理。
                  </p>
                </div>
                <StatusBadge enabled={payment.form.enabled} configured={Boolean(payment.config?.privateKeyConfigured)} />
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <ToggleCard
                checked={payment.form.enabled}
                description="关闭后，升级中心会提示用户联系管理员。"
                label="启用支付宝支付"
                onChange={(checked) => payment.updateField("enabled", checked)}
              />
              <EnvironmentSwitch
                sandbox={payment.form.sandbox}
                onChange={(sandbox) => {
                  payment.updateField("sandbox", sandbox);
                  payment.updateField(
                    "gateway",
                    sandbox
                      ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
                      : "https://openapi.alipay.com/gateway.do",
                  );
                }}
              />

              <TextInput
                label="APP_ID"
                placeholder="例如 2021003191677063"
                value={payment.form.appId}
                onChange={(value) => payment.updateField("appId", value)}
              />
              <TextInput
                label="网关地址"
                placeholder="https://openapi.alipay.com/gateway.do"
                value={payment.form.gateway}
                onChange={(value) => payment.updateField("gateway", value)}
              />
              <TextInput
                label="Return URL"
                placeholder="https://example.com/dashboard?payment=alipay_return"
                value={payment.form.returnUrl}
                onChange={(value) => payment.updateField("returnUrl", value)}
              />
              <TextInput
                label="Notify URL"
                placeholder="https://example.com/api/payments/alipay/notify"
                value={payment.form.notifyUrl}
                onChange={(value) => payment.updateField("notifyUrl", value)}
              />

              <SecretTextarea
                className="lg:col-span-2"
                label="支付宝公钥"
                note={
                  payment.config?.alipayPublicKeyConfigured
                    ? `已保存公钥：${payment.config.alipayPublicKeyPreview ?? "已配置"}。留空表示不修改。`
                    : "粘贴支付宝开放平台提供的公钥。"
                }
                placeholder="粘贴支付宝公钥，留空则保留已有配置"
                value={payment.form.publicKeyInput}
                onChange={(value) => {
                  payment.updateField("publicKeyInput", value);
                  if (value.trim()) payment.updateField("clearPublicKey", false);
                }}
              />

              <label className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-sky-300/50 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-800 dark:text-sky-100">
                <input
                  type="checkbox"
                  checked={payment.form.clearPublicKey}
                  onChange={(event) => {
                    payment.updateField("clearPublicKey", event.target.checked);
                    if (event.target.checked) payment.updateField("publicKeyInput", "");
                  }}
                  className="h-4 w-4 rounded border-[var(--theme-border)]"
                />
                清空已保存支付宝公钥
              </label>

              <SecretTextarea
                className="lg:col-span-2"
                label="应用私钥"
                note={
                  payment.config?.privateKeyConfigured
                    ? "应用私钥：已安全保存。留空表示不修改，不会回显已保存私钥。"
                    : "需要配置 SETTINGS_ENCRYPTION_KEY 后才能保存私钥。"
                }
                placeholder="粘贴应用私钥，保存后将加密存储且不会回显"
                value={payment.form.privateKeyInput}
                onChange={(value) => {
                  payment.updateField("privateKeyInput", value);
                  if (value.trim()) payment.updateField("clearPrivateKey", false);
                }}
              />

              <label className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-100">
                <input
                  type="checkbox"
                  checked={payment.form.clearPrivateKey}
                  onChange={(event) => {
                    payment.updateField("clearPrivateKey", event.target.checked);
                    if (event.target.checked) payment.updateField("privateKeyInput", "");
                  }}
                  className="h-4 w-4 rounded border-[var(--theme-border)]"
                />
                清空已保存应用私钥
              </label>
            </div>
          </AppCard>

          <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
            <NoticePanel payment={payment} />
            <SecurityPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ configured, enabled }: { configured: boolean; enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold",
        enabled
          ? "border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : "border-stone-200 bg-stone-50 text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", enabled ? "bg-emerald-500" : "bg-stone-400")} />
      {enabled ? (configured ? "已启用" : "待补齐密钥") : "未启用"}
    </span>
  );
}

function ToggleCard({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-[var(--theme-text-strong)]">{label}</div>
        <div className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">{description}</div>
      </div>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-[var(--theme-brand-600)]" : "bg-stone-300 dark:bg-stone-700",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}

function EnvironmentSwitch({
  onChange,
  sandbox,
}: {
  sandbox: boolean;
  onChange: (sandbox: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-3">
      <div className="text-sm font-extrabold text-[var(--theme-text-strong)]">运行环境</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "沙箱", value: true },
          { label: "正式", value: false },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "h-9 rounded-lg border text-sm font-bold transition",
              sandbox === item.value
                ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
                : "border-[var(--theme-border)] bg-[var(--theme-surface-solid)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-strong)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-extrabold text-[var(--theme-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="theme-input h-10 w-full rounded-lg px-3 text-sm font-semibold"
      />
    </label>
  );
}

function SecretTextarea({
  className,
  label,
  note,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  note: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-[var(--theme-text-muted)]">
        <EyeOff className="h-3.5 w-3.5" />
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="theme-textarea min-h-28 w-full resize-y rounded-lg px-3 py-2 font-mono text-xs leading-5"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="mt-1.5 block text-xs font-semibold text-[var(--theme-text-muted)]">
        {note}
      </span>
    </label>
  );
}

function NoticePanel({ payment }: { payment: AlipayPaymentSettingsController }) {
  if (payment.error) {
    return (
      <AppCard className="border-red-300/60 bg-red-500/10 p-4 text-red-700 dark:text-red-100">
        <div className="flex items-start gap-2 text-sm font-bold">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {payment.error}
        </div>
      </AppCard>
    );
  }

  if (payment.successMessage) {
    return (
      <AppCard className="border-emerald-300/60 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-100">
        <div className="flex items-start gap-2 text-sm font-bold">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {payment.successMessage}
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-4">
      <div className="flex items-start gap-2 text-sm font-bold text-[var(--theme-text-strong)]">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-brand-600)]" />
        支付宝 APP_ID 可以保存明文；应用私钥必须通过服务器加密后保存。
      </div>
    </AppCard>
  );
}

function SecurityPanel() {
  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--theme-text-strong)]">
        <ShieldCheck className="h-4 w-4 text-[var(--theme-brand-600)]" />
        安全边界
      </div>
      <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          私钥不会进入前端 bundle，也不会从 API 返回。
        </li>
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          支付成功发放会员后续只能在异步通知里处理。
        </li>
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Notify 回调后续不能做 same-origin 校验。
        </li>
      </ul>
    </AppCard>
  );
}
