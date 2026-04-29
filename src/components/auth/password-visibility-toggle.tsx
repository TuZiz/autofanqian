"use client";

import { Eye, EyeOff } from "lucide-react";

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
};

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: PasswordVisibilityToggleProps) {
  const Icon = visible ? EyeOff : Eye;
  const label = visible ? "隐藏密码" : "显示密码";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={visible}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
      className="theme-field-action flex w-12 items-center justify-center"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
