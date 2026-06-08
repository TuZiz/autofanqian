import "server-only";

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const DAY_MS = 24 * 60 * 60 * 1000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export type AdminDayRange = {
  day: string;
  end: Date;
  start: Date;
};

export function getShanghaiDayRange(date = new Date()): AdminDayRange {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [yearRaw, monthRaw, dayRaw] = day.split("-");

  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error("Unable to resolve Asia/Shanghai day.");
  }

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const dayOfMonth = Number(dayRaw);
  const startUtcMs = Date.UTC(year, month - 1, dayOfMonth) - SHANGHAI_OFFSET_MS;

  return {
    day,
    end: new Date(startUtcMs + DAY_MS),
    start: new Date(startUtcMs),
  };
}
