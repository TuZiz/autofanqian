import type { UpstreamTextResult } from "./types";

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

export function getReadableAiErrorMessage(
  result: Pick<UpstreamTextResult, "status" | "upstreamMessage">,
  fallback = "AI 服务调用失败，请稍后重试。",
) {
  const message = result.upstreamMessage?.trim();

  if (result.status === 0) {
    return "AI 服务网络异常或上游不可达，请稍后重试。";
  }

  if (result.status === 401) {
    return "AI 服务鉴权失败，请检查 GPT_PRIMARY_API_KEY / GPT_FALLBACK_API_KEY / ARK_API_KEY。";
  }

  if (result.status === 408) {
    return "AI 服务响应超时，请稍后重试。";
  }

  if (result.status === 429) {
    return "AI 服务请求过于频繁（上游限流），请稍后重试。";
  }

  if (
    result.status === 503 ||
    (typeof message === "string" &&
      /service temporarily unavailable|service unavailable|temporarily unavailable/i.test(
        message,
      ))
  ) {
    return "AI 服务暂时不可用（上游拥堵或维护），请稍后重试。";
  }

  if (result.status === 502) {
    return "AI 服务暂时不可用（上游网关异常 502），请稍后重试。";
  }

  if (result.status === 504) {
    return "AI 服务响应超时（上游 504），请稍后重试。";
  }

  if (result.status === 529) {
    return "AI 服务暂时过载，请稍后重试。";
  }

  if (result.status === 499) {
    return "AI 生成已取消。";
  }

  if (typeof message === "string" && containsChinese(message)) {
    return result.status
      ? `AI 服务调用失败：${message}（HTTP ${result.status}）`
      : `AI 服务调用失败：${message}`;
  }

  return fallback;
}
