import "server-only";

import { AuthApiError } from "@/lib/auth/errors";

export type ParsedDateRange = {
  from?: Date;
  to?: Date;
};

export function parseOptionalDate(value: string | undefined, field: "from" | "to") {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AuthApiError(400, `${field} must be a valid ISO date.`);
  }
  return date;
}

export function assertValidDateRange(from: Date | undefined, to: Date | undefined) {
  if (from && to && from.getTime() > to.getTime()) {
    throw new AuthApiError(400, "from must be earlier than to.");
  }
}

export function parseDateRangeFromSearchParams(searchParams: URLSearchParams): ParsedDateRange {
  const from = parseOptionalDate(searchParams.get("from") ?? undefined, "from");
  const to = parseOptionalDate(searchParams.get("to") ?? undefined, "to");
  assertValidDateRange(from, to);
  return { from, to };
}
