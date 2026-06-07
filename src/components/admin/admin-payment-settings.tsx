"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";

import { Button, SectionCard } from "@/components/design-system";
import { AdminStateScreen } from "@/components/admin/admin-state-screen";
import type { AlipayPaymentSettingsController } from "@/lib/admin/use-alipay-payment-settings";
import { cn } from "@/lib/utils";

import { AdminFormGroup, AdminStatusPill } from "./admin-console-primitives";
import { AdminWorkspaceShell } from "./admin-workspace-shell";

type AdminPaymentSettingsProps = {
  payment: AlipayPaymentSettingsController;
};

export function AdminPaymentSettings({ payment }: AdminPaymentSettingsProps) {
  if (payment.loading) {
    return <AdminStateScreen message="正在加载支付设置..." />;
  }

  const canSave = payment.saving || !payment.canManagePayments;

  return (
    <AdminWorkspaceShell
      breadcrumbs={[{ label: "支付设置" }]}
      description="支付 / 会员"
      icon={CreditCard}
      subtitle="支付宝参数保存在后台配置中；应用私钥只会加密存入 AppConfig，不会回显到前端。"
      title="支付设置"
      userEmail={payment.user?.email ?? ""}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusPill tone={payment.form.enabled ? "success" : "neutral"}>
            {payment.form.enabled ? "已启用" : "未启用"}
          </AdminStatusPill>
          <AdminStatusPill tone={payment.config?.privateKeyConfigured ? "success" : "warning"}>
            {payment.config?.privateKeyConfigured ? "私钥已配置" : "待补齐密钥"}
          </AdminStatusPill>
          <Button
            type="button"
            icon={Save}
            onClick={payment.handleSave}
            disabled={canSave}
            busy={payment.saving}
            className="min-h-9 px-3"
          >
            {payment.saving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard
          title="支付宝支付"
          description="修改后会影响后续会员订单创建；已有订单不在这一轮配置范围内。"
          icon={CreditCard}
          variant="elevated"
          actions={
            <PaymentStatusBadge
              enabled={payment.form.enabled}
              configured={Boolean(payment.config?.privateKeyConfigured)}
            />
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
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

            <label className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-[var(--theme-info-border)] bg-[var(--theme-info-soft)] px-3 py-2 text-xs font-bold text-[var(--theme-info-text)]">
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
                  : "需要先配置 SETTINGS_ENCRYPTION_KEY，随后才能保存私钥。"
              }
              placeholder="粘贴应用私钥，保存后将加密存储且不会回显"
              value={payment.form.privateKeyInput}
              onChange={(value) => {
                payment.updateField("privateKeyInput", value);
                if (value.trim()) payment.updateField("clearPrivateKey", false);
              }}
            />

            <label className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] px-3 py-2 text-xs font-bold text-[var(--theme-warning-text)]">
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
        </SectionCard>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <NoticePanel payment={payment} />
          <SecurityPanel />
        </aside>
      </div>
    </AdminWorkspaceShell>
  );
}

function PaymentStatusBadge({ configured, enabled }: { configured: boolean; enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold",
        enabled
          ? "border-[var(--theme-brand-border)] bg-[var(--theme-brand-soft)] text-[var(--theme-brand-text)]"
          : "border-[var(--theme-border)] bg-[var(--theme-surface-overlay)] text-[var(--theme-text-muted)]",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          enabled ? "bg-[var(--theme-brand-500)]" : "bg-[var(--theme-text-muted)]",
        )}
      />
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
          checked ? "bg-[var(--theme-brand-600)]" : "bg-[var(--theme-surface-overlay)]",
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
      <AdminFormGroup
        title="保存失败"
        description={payment.error}
        badge={<AdminStatusPill tone="danger">需要处理</AdminStatusPill>}
        danger
      >
        <div className="flex items-start gap-2 text-sm font-semibold text-[var(--theme-danger-text)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          请先修正支付参数，再重新保存。
        </div>
      </AdminFormGroup>
    );
  }

  if (payment.successMessage) {
    return (
      <AdminFormGroup
        title="保存成功"
        description={payment.successMessage}
        badge={<AdminStatusPill tone="success">已同步</AdminStatusPill>}
      >
        <div className="flex items-start gap-2 text-sm font-semibold text-[var(--theme-success-text)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          新配置已写入后台，后续会员支付将按当前参数执行。
        </div>
      </AdminFormGroup>
    );
  }

  return (
    <AdminFormGroup
      title="配置提示"
      description="APP_ID、网关和回调地址可直接维护；私钥和支付宝公钥建议在同一轮校验后再保存。"
      badge={<AdminStatusPill tone="neutral">待确认</AdminStatusPill>}
    >
      <div className="flex items-start gap-2 text-sm font-semibold text-[var(--theme-text-strong)]">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-brand-600)]" />
        支付宝 APP_ID 可以明文保存，应用私钥仍然只会在服务端加密后落库。
      </div>
    </AdminFormGroup>
  );
}

function SecurityPanel() {
  return (
    <SectionCard
      title="安全边界"
      description="保留支付配置最关键的三条约束，方便管理员在修改时快速自检。"
      icon={ShieldCheck}
    >
      <ul className="space-y-3 text-xs font-semibold leading-5 text-[var(--theme-text-muted)]">
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--theme-brand-600)]" />
          私钥不会进入前端 bundle，也不会通过接口回显。
        </li>
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--theme-brand-600)]" />
          会员发放只能依赖支付宝异步通知，返回页只展示结果。
        </li>
        <li className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--theme-brand-600)]" />
          Notify 回调来自支付宝服务端，后续不能依赖 same-origin 校验。
        </li>
      </ul>
    </SectionCard>
  );
}
