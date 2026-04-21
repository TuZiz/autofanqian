"use client";

import { useEffect, useRef, useState } from "react";

type ToastState = {
  message: string;
  success: boolean;
} | null;

export function useAuthToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function showToast(message: string, success = true) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setToast({ message, success });
    timerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  return {
    toast,
    showToast,
  };
}
