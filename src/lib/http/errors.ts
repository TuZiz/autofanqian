export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiErrorPayload = {
  status: number;
  message: string;
  fieldErrors?: ApiFieldErrors;
  code?: string;
};

export class ApiClientError extends Error {
  status: number;
  fieldErrors?: ApiFieldErrors;
  code?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiClientError";
    this.status = payload.status;
    this.fieldErrors = payload.fieldErrors;
    this.code = payload.code;
  }
}
