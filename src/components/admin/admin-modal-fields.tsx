"use client";

import { useEffect, type ReactNode } from "react";

export function ModalFrame({
  children,
  onClose,
  zIndex,
}: {
  children: ReactNode;
  onClose: () => void;
  zIndex: string;
}) {
  const titleId = `modal-title-${zIndex}`;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, zIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-stone-950/30 px-4 py-10 backdrop-blur-sm dark:bg-black/70`}
    >
      <div className="glass-panel w-full max-w-xl rounded-lg p-6 shadow-sm">{children}</div>
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="theme-kicker text-xs font-bold">{kicker}</div>
        <div className="theme-heading mt-1 text-lg font-semibold">{title}</div>
        <p className="theme-subheading mt-1 text-sm">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="theme-button-secondary rounded-lg px-4 py-2 text-sm font-semibold"
      >
        关闭
      </button>
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
    <div>
      <label className="theme-subheading text-sm font-semibold">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
        type={type}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          "theme-input mt-2 w-full rounded-lg px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
          inputClassName ?? "",
        ].join(" ")}
      />
    </div>
  );
}

export function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div>
      <label className="theme-subheading text-sm font-semibold">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="theme-select mt-2 w-full rounded-lg px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
