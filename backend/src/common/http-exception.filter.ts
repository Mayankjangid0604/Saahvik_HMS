import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { API_VERSION } from "./wrap-success";

interface ErrorBody {
  code: string;
  message: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ErrorBody = { code: "INTERNAL_ERROR", message: "Something went wrong" };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        error = { code: httpCode(status), message: body };
      } else {
        const b = body as Record<string, unknown>;
        // class-validator errors arrive as { message: string[] }
        const message = Array.isArray(b.message)
          ? (b.message as string[]).join("; ")
          : String(b.message ?? exception.message);
        const { statusCode: _sc, error: _e, message: _m, code, ...extra } = b;
        error = { ...extra, code: typeof code === "string" ? code : httpCode(status), message };
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ success: false, apiVersion: API_VERSION, error });
  }
}

function httpCode(status: number): string {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "UNPROCESSABLE";
    default: return "ERROR";
  }
}
