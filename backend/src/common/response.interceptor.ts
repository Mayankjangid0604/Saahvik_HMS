import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { API_VERSION, wrapSuccess } from "./wrap-success";

/**
 * Wraps every JSON response in the wrapSuccess envelope. Streamed responses
 * (PDFs, file downloads) pass through untouched.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        map((data) =>
          data instanceof StreamableFile ? data : wrapSuccess(data, API_VERSION),
        ),
      );
  }
}
