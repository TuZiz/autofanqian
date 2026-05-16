import { errorResponse, successResponse } from "@/lib/auth/api";
import { AuthApiError } from "@/lib/auth/errors";
import {
  assertLoginAllowed,
  recordLoginAttempt,
} from "@/lib/auth/login-security";
import { getRequestMeta, normalizeAuditEmail } from "@/lib/auth/request";
import { loginSchema } from "@/lib/auth/schemas";
import { createSessionCookie } from "@/lib/auth/session";
import { loginWithPassword } from "@/lib/auth/service";
import { getUserAccessSnapshot } from "@/lib/auth/admin";
import { zhCN } from "@/lib/copy/zh-cn";
import { assertSameOriginRequest } from "@/lib/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return errorResponse(error);
  }
  const meta = getRequestMeta(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    const error = new AuthApiError(
      400,
      zhCN.auth.response.invalidJson,
      undefined,
      "invalid_json"
    );
    await recordLoginAttempt({
      email: "",
      ...meta,
      success: false,
      failureReason: error.internalReason,
    });
    return errorResponse(error);
  }

  const auditEmail =
    typeof body === "object" && body
      ? normalizeAuditEmail((body as Record<string, unknown>).email)
      : "";
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    await recordLoginAttempt({
      email: auditEmail,
      ...meta,
      success: false,
      failureReason: "validation_failed",
    });
    return errorResponse(parsed.error);
  }

  const { email, password } = parsed.data;

  try {
    try {
      await assertLoginAllowed(email, meta.ip);
    } catch (error) {
      await recordLoginAttempt({
        email,
        ...meta,
        success: false,
        failureReason:
          error instanceof AuthApiError
            ? error.internalReason ?? "rate_limited"
            : "rate_limited",
      });
      throw error;
    }

    const user = await loginWithPassword(email, password);
    await recordLoginAttempt({
      email,
      ...meta,
      success: true,
      userId: user.id,
    });

    const sessionCookie = await createSessionCookie(user.id, meta);

    const response = successResponse(
      {
        redirectTo: "/dashboard",
        user: {
          ...user,
          ...getUserAccessSnapshot(user),
        },
      },
      {
        message: zhCN.auth.response.loginSuccess,
      }
    );

    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options
    );

    return response;
  } catch (error) {
    if (
      error instanceof AuthApiError &&
      error.internalReason !== "rate_limited_ip" &&
      error.internalReason !== "rate_limited_email"
    ) {
      await recordLoginAttempt({
        email,
        ...meta,
        success: false,
        failureReason: error.internalReason ?? "auth_failed",
      });
    } else if (!(error instanceof AuthApiError)) {
      await recordLoginAttempt({
        email,
        ...meta,
        success: false,
        failureReason: "server_error",
      });
    }

    return errorResponse(error);
  }
}
