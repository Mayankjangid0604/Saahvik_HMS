import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Structured error the frontend can branch on by `code`
 * (e.g. STAFF_CAP_EXCEEDED → upgrade-prompt UI).
 */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    extra: Record<string, unknown> = {},
  ) {
    super({ code, message, ...extra }, status);
  }

  static notFound(what: string): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, "NOT_FOUND", `${what} not found`);
  }

  static badRequest(message: string, extra: Record<string, unknown> = {}): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message, extra);
  }
}
