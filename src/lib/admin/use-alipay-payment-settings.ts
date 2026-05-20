"use client";

import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";
import type { SessionAccessFields } from "@/lib/auth/session-user-types";
import { apiRequest as rawApiRequest } from "@/lib/http/client";
import { ApiClientError } from "@/lib/http/errors";

type PaymentSettingsUser = SessionAccessFields & {
  id: string;
  email: string;
};

export type SafeAlipayPaymentConfig = {
  version: 1;
  enabled: boolean;
  sandbox: boolean;
  appId: string;
  gateway: string;
  returnUrl: string;
  notifyUrl: string;
  signType: "RSA2";
  alipayPublicKeyConfigured: boolean;
  alipayPublicKeyPreview: string | null;
  privateKeyConfigured: boolean;
};

type AlipayPaymentForm = {
  enabled: boolean;
  sandbox: boolean;
  appId: string;
  gateway: string;
  returnUrl: string;
  notifyUrl: string;
  publicKeyInput: string;
  privateKeyInput: string;
  clearPublicKey: boolean;
  clearPrivateKey: boolean;
};

const emptyForm: AlipayPaymentForm = {
  enabled: false,
  sandbox: true,
  appId: "",
  gateway: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
  returnUrl: "",
  notifyUrl: "",
  publicKeyInput: "",
  privateKeyInput: "",
  clearPublicKey: false,
  clearPrivateKey: false,
};

function toForm(config: SafeAlipayPaymentConfig): AlipayPaymentForm {
  return {
    enabled: config.enabled,
    sandbox: config.sandbox,
    appId: config.appId,
    gateway: config.gateway,
    returnUrl: config.returnUrl,
    notifyUrl: config.notifyUrl,
    publicKeyInput: "",
    privateKeyInput: "",
    clearPublicKey: false,
    clearPrivateKey: false,
  };
}

export function useAlipayPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<PaymentSettingsUser | null>(null);
  const [config, setConfig] = useState<SafeAlipayPaymentConfig | null>(null);
  const [form, setForm] = useState<AlipayPaymentForm>(emptyForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canManagePayments = useMemo(
    () => Boolean(user?.isRootAdmin || user?.role === "super_admin"),
    [user],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      const session = await apiRequest<{ user: PaymentSettingsUser }>("/api/auth/session");
      if (cancelled) return;

      if (!session.success || !session.data?.user) {
        window.location.href = "/login";
        return;
      }

      if (!session.data.user.isAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setUser(session.data.user);
      const isPaymentAdmin = Boolean(session.data.user.isRootAdmin || session.data.user.role === "super_admin");
      if (!isPaymentAdmin) {
        setError("只有根管理员或超级管理员可以管理支付设置。");
        setLoading(false);
        return;
      }

      const response = await apiRequest<{ config: SafeAlipayPaymentConfig }>("/api/admin/payments/alipay", undefined, {
        redirectOnUnauthorized: true,
      });
      if (cancelled) return;

      if (!response.success || !response.data?.config) {
        setError(response.message || "加载支付宝支付设置失败。");
        setLoading(false);
        return;
      }

      setConfig(response.data.config);
      setForm(toForm(response.data.config));
      setLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof AlipayPaymentForm>(key: K, value: AlipayPaymentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccessMessage("");
  }

  async function handleSave() {
    if (saving || !canManagePayments) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const publicKey = form.publicKeyInput.trim();
    const privateKey = form.privateKeyInput.trim();
    const payload = {
      enabled: form.enabled,
      sandbox: form.sandbox,
      appId: form.appId,
      gateway: form.gateway,
      returnUrl: form.returnUrl,
      notifyUrl: form.notifyUrl,
      signType: "RSA2" as const,
      ...(form.clearPublicKey ? { alipayPublicKey: "__CLEAR__" } : publicKey ? { alipayPublicKey: publicKey } : {}),
      ...(form.clearPrivateKey ? { privateKey: "__CLEAR__" } : privateKey ? { privateKey } : {}),
    };

    try {
      const response = await rawApiRequest<{ config: SafeAlipayPaymentConfig }>(
        "/api/admin/payments/alipay",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setConfig(response.config);
      setForm(toForm(response.config));
      setSuccessMessage("支付宝支付设置已保存，后续下单会优先使用后台配置。");
    } catch (saveError) {
      setError(saveError instanceof ApiClientError ? saveError.message : "保存支付宝支付设置失败。");
    } finally {
      setSaving(false);
    }
  }

  return {
    canManagePayments,
    config,
    error,
    form,
    handleSave,
    loading,
    saving,
    successMessage,
    updateField,
    user,
  };
}

export type AlipayPaymentSettingsController = ReturnType<typeof useAlipayPaymentSettings>;
