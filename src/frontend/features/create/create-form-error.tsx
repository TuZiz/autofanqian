"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function CreateFormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      id="create-form-error"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="rounded-xl border border-red-200 bg-red-50/90 shadow-sm dark:border-red-500/20 dark:bg-red-500/10"
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">
            请先处理当前输入问题
          </p>
          <p className="mt-1 text-sm leading-6 text-red-700/90 dark:text-red-100/90">
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
