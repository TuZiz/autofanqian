import { successResponse } from "@/lib/auth/api";
import { zhCN } from "@/lib/copy/zh-cn";
import {
  createClearedSessionCookie,
  revokeCurrentSession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
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
