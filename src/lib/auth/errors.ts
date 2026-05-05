export type ApiFieldErrors = Record<string, string[] | undefined>;

export class AuthApiError extends Error {
  status: number;
  fieldErrors?: ApiFieldErrors;
  internalReason?: string;

  constructor(
    status: number,
    message: string,
    fieldErrors?: ApiFieldErrors,
    internalReason?: string
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.internalReason = internalReason;
  }
}
