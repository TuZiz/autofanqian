"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { X } from "lucide-react";

import { Button, FieldShell, SectionCard } from "@/components/design-system";
import { cn } from "@/lib/utils";

import { AdminStatusPill } from "./admin-console-primitives";

export function ModalFrame({
  children,
  onClose,
  zIndex,
}: {
  children: ReactNode;
  onClose: () => void;
  zIndex: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-[rgba(10,14,20,0.56)] px-4 py-8 backdrop-blur-md`}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <SectionCard
          variant="elevated"
          className="overflow-hidden border-[var(--theme-border-strong)] shadow-[var(--theme-shadow-panel)]"
        >
          {children}
        </SectionCard>
      </div>
    </div>
  );
}

export function ModalHeader({
  kicker,
  onClose,
  subtitle,
  title,
}: {
  kicker: string;
  onClose: () => void;
  subtitle: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--theme-divider)] pb-4">
      <div className="min-w-0">
        <AdminStatusPill tone="neutral">{kicker}</AdminStatusPill>
        <h2 className="mt-3 text-[20px] font-black tracking-[-0.03em] text-[var(--theme-text-strong)]">
          {title}
        </h2>
        <div className="mt-1 text-sm font-medium leading-6 text-[var(--theme-text-secondary)]">
          {subtitle}
        </div>
      </div>
      <Button
        type="button"
        tone="ghost"
        icon={X}
        onClick={onClose}
        className="min-h-10 px-3"
      >
        关闭
      </Button>
    </div>
  );
}

export function ModalSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title?: string;
}) {
  if (!title && !description) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <div className="rounded-[16px] border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] p-4">
      {title ? (
        <h3 className="text-[13px] font-black text-[var(--theme-text-strong)]">
          {title}
        </h3>
      ) : null}
      {description ? (
        <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--theme-text-secondary)]">
          {description}
        </p>
      ) : null}
      <div className={cn("space-y-4", title || description ? "mt-4" : "")}>
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--theme-divider)] pt-4">
      {children}
    </div>
  );
}

export function TextField({
  autoFocus,
  disabled,
  inputClassName,
  label,
  onChange,
  onEnter,
  placeholder,
  type = "text",
  value,
}: {
  autoFocus?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  label: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-extrabold text-[var(--theme-text-muted)]">
        {label}
      </span>
      <FieldShell
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
        type={type}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        className="h-11"
        inputClassName={cn("text-sm font-semibold", inputClassName)}
      />
    </label>
  );
}

export function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
  ...props
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-extrabold text-[var(--theme-text-muted)]">
        {label}
      </span>
      <select
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="theme-select h-11 w-full rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-surface-solid)] px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-[var(--theme-border)] text-[var(--theme-brand-text)] focus:ring-[var(--theme-brand-500)]/50 disabled:cursor-not-allowed"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--theme-text-strong)]">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--theme-text-secondary)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function NoticeText({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "danger" | "neutral" | "warning";
}) {
  const toneClassName =
    tone === "danger"
      ? "border-[var(--theme-danger-border)] bg-[var(--theme-danger-soft)] text-[var(--theme-danger-text)]"
      : tone === "warning"
        ? "border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] text-[var(--theme-warning-text)]"
        : "border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text-secondary)]";

  return (
    <div
      className={cn(
        "rounded-[14px] border px-3 py-3 text-xs font-semibold leading-5",
        toneClassName,
      )}
    >
      {children}
    </div>
  );
}

export type ModalInputProps = InputHTMLAttributes<HTMLInputElement>;
