import { successResponse } from "@/lib/auth/api";
import { zhCN } from "@/lib/copy/zh-cn";
import {
  createClearedSessionCookie,
  revokeCurrentSession,
} from "@/lib/auth/session";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertSameOriginRequest(request);

  await revokeCurrentSession();

  const clearedSessionCookie = createClearedSessionCookie();
  const response = successResponse(
    {
      redirectTo: "/login",
    },
    {
      message: zhCN.auth.response.logoutSuccess,
    }
  );

  response.cookies.set(
    clearedSessionCookie.name,
    clearedSessionCookie.value,
    clearedSessionCookie.options
  );

  return response;
}
