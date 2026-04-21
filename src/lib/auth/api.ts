import { NextResponse } from "next/server";
import { ZodError, z, type ZodType } from "zod";

import { AuthApiError, type ApiFieldErrors } from "@/lib/auth/errors";
import { zhCN } from "@/lib/copy/zh-cn";

type ApiSuccessOptions = {
  message: string;
  status?: number;
};

export function successResponse<T>(
  data: T,
  { message, status = 200 }: ApiSuccessOptions
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthApiError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        fieldErrors: error.fieldErrors,
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: zhCN.auth.response.validationFailed,
        fieldErrors: error.flatten().fieldErrors as ApiFieldErrors,
      },
      { status: 400 }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      success: false,
      message: zhCN.auth.response.serverError,
    },
    { status: 500 }
  );
}

export async function parseJsonBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new AuthApiError(400, zhCN.auth.response.invalidJson);
  }

  return schema.parse(body);
}
