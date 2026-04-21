export type ApiFieldErrors = Record<string, string[] | undefined>;

export class AuthApiError extends Error {
  status: number;
  fieldErrors?: ApiFieldErrors;

  constructor(status: number, message: string, fieldErrors?: ApiFieldErrors) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}
