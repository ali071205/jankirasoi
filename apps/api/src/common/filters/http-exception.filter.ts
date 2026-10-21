import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message = 'An unexpected internal server error occurred.';
    let code = 'INTERNAL_ERROR';
    let details: any = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as Record<string, any>;
      message = resObj['message'] || message;
      code = resObj['code'] || (status === 400 ? 'BAD_REQUEST' : code);
      details = resObj['details'] || (Array.isArray(resObj['message']) ? resObj['message'] : null);
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] || 'Error',
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    });
  }
}
