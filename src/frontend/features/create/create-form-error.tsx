"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function CreateFormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      id="create-form-error"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="flex items-start gap-2 rounded-xl border border-[var(--theme-danger-border)] bg-[var(--theme-surface-solid)] px-3 py-2 text-[13px] leading-5 text-[var(--theme-danger-text)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </motion.div>
  );
}
