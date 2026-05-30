import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Retrieve exception response message
    let message: any = 'Internal server error';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as any;
        message = resObj.message || resObj.error || message;
        errorName = resObj.error || exception.name;
      } else {
        message = exceptionResponse;
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    // Format response payload
    const formattedError = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      error: errorName,
    };

    // Log the error for diagnostic tracking
    console.error(
      `\x1b[31m[API EXCEPTION]\x1b[0m [${formattedError.timestamp}] ${request.method} ${request.url} - Status ${status} - Error: "${errorName}" - Message:`,
      message,
    );

    response.status(status).json(formattedError);
  }
}
