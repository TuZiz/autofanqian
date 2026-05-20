"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "@/lib/client/auth-api";

const DEPLOY_JOB_STORAGE_KEY = "autofanqian.admin.deployJobId";

export type AdminVersionStatus = {
  currentVersion: string;
  currentCommit: string;
  currentBranch: string;
  builtAt: string | null;
  latestVersion: string | null;
  latestCommit: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
  checkedAt: string;
};

export type AdminDeployJob = {
  id: string;
  status: "running" | "success" | "failed" | string;
  currentVersion: string | null;
  targetVersion: string | null;
  commitBefore: string | null;
  commitAfter: string | null;
  log: string;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export function useAdminVersionCenter() {
  const [version, setVersion] = useState<AdminVersionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [job, setJob] = useState<AdminDeployJob | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pollingRef = useRef<number | null>(null);
  const pollingJobIdRef = useRef<string | null>(null);
  const pollingFailuresRef = useRef(0);

  const isLatest = useMemo(() => Boolean(version && !version.hasUpdate), [version]);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingJobIdRef.current = null;
    pollingFailuresRef.current = 0;
  }, []);

  const forgetStoredJob = useCallback(() => {
    try {
      window.localStorage.removeItem(DEPLOY_JOB_STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const rememberStoredJob = useCallback((jobId: string) => {
    try {
      window.localStorage.setItem(DEPLOY_JOB_STORAGE_KEY, jobId);
    } catch {
      // ignore storage failures
    }
  }, []);

  const checkVersion = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await apiRequest<{ version: AdminVersionStatus }>("/api/admin/system/version", undefined, {
      redirectOnUnauthorized: false,
    });
    setLoading(false);

    if (!response.success || !response.data?.version) {
      setError(response.message || "版本检查失败。");
      return false;
    }

    setVersion(response.data.version);
    setMessage(response.data.version.hasUpdate ? "发现可用更新。" : "当前已是最新版。");
    return true;
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      const response = await apiRequest<{ job: AdminDeployJob }>(`/api/admin/system/update/${encodeURIComponent(jobId)}`, undefined, {
        redirectOnUnauthorized: false,
      });

      if (!response.success || !response.data?.job) {
        pollingFailuresRef.current += 1;
        setMessage("网站正在重启，正在等待服务恢复...");
        if (pollingFailuresRef.current >= 20) {
          setError(response.message || "更新状态读取失败，请刷新页面查看结果。");
          clearPolling();
          setUpdating(false);
        }
        return;
      }

      pollingFailuresRef.current = 0;
      const nextJob = response.data.job;
      setJob(nextJob);

      if (nextJob.status === "success") {
        clearPolling();
        forgetStoredJob();
        setUpdating(false);
        setMessage("更新完成，页面将在 3 秒后刷新。");
        window.setTimeout(() => window.location.reload(), 3000);
      } else if (nextJob.status === "failed") {
        clearPolling();
        forgetStoredJob();
        setUpdating(false);
        setError(nextJob.error || "云端更新失败，请查看日志。");
      }
    },
    [clearPolling, forgetStoredJob],
  );

  const startPollingJob = useCallback(
    (jobId: string) => {
      if (pollingJobIdRef.current === jobId && pollingRef.current) return;
      clearPolling();
      pollingJobIdRef.current = jobId;
      pollingFailuresRef.current = 0;
      void pollJob(jobId);
      pollingRef.current = window.setInterval(() => void pollJob(jobId), 3000);
    },
    [clearPolling, pollJob],
  );

  const startUpdate = useCallback(async () => {
    if (!window.confirm("更新会拉取 GitHub main 并重启网站，确认继续？")) return;

    clearPolling();
    setUpdating(true);
    setError("");
    setMessage("正在更新...");
    setJob(null);

    const response = await apiRequest<{ jobId: string }>("/api/admin/system/update", {}, { method: "POST" });
    if (!response.success || !response.data?.jobId) {
      setUpdating(false);
      setError(response.message || "云端更新启动失败。");
      return;
    }

    const jobId = response.data.jobId;
    rememberStoredJob(jobId);
    setMessage("云端更新已开始。");
    startPollingJob(jobId);
  }, [clearPolling, rememberStoredJob, startPollingJob]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkVersion();
      try {
        const storedJobId = window.localStorage.getItem(DEPLOY_JOB_STORAGE_KEY);
        if (storedJobId) {
          setUpdating(true);
          setMessage("检测到未完成的云端更新，正在恢复状态...");
          startPollingJob(storedJobId);
        }
      } catch {
        // ignore storage failures
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      clearPolling();
    };
  }, [checkVersion, clearPolling, startPollingJob]);

  return {
    checkVersion,
    error,
    isLatest,
    job,
    loading,
    message,
    startUpdate,
    updating,
    version,
  };
}
