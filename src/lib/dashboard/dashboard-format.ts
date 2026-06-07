export function formatRelativeTime(value?: string) {
  if (!value) return "暂无记录";

  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "暂无记录";

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))} 天前`;

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatWordStat(value: number) {
  const safeValue = Math.max(0, Math.round(value || 0));

  if (safeValue >= 10000) {
    const compact = safeValue / 10000;
    return {
      value: compact >= 100 ? String(Math.round(compact)) : compact.toFixed(1).replace(/\.0$/, ""),
      unit: "万字",
    };
  }

  if (safeValue >= 1000) {
    const compact = safeValue / 1000;
    return {
      value: compact >= 100 ? String(Math.round(compact)) : compact.toFixed(1).replace(/\.0$/, ""),
      unit: "k字",
    };
  }

  return {
    value: String(safeValue),
    unit: "字",
  };
}

export function getWorkAccentGradient(key: string) {
  const gradients = [
    "from-[#0ea5e9] to-[#0284c7]",
    "from-[#06b6d4] to-[#2563eb]",
    "from-[#38bdf8] to-[#0369a1]",
  ] as const;

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }

  return gradients[hash % gradients.length];
}
