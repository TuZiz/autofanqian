"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export function CreateFormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      id="create-form-error"
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className="border border-red-200 bg-red-50/80 px-5 py-4 text-sm font-bold leading-relaxed text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    >
      <span className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{message}</span>
      </span>
    </motion.div>
  );
}
