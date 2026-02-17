/**
 * Logging utilities with request ID propagation
 * Fastify automatically assigns request.id to each request
 */

import { FastifyRequest } from 'fastify';

interface LogContext {
  reqId?: string;
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

/**
 * Creates a log context with request ID and other metadata
 */
export function createLogContext(request: FastifyRequest, additional?: LogContext): LogContext {
  return {
    reqId: request.id,
    userId: (request as any).userId,
    endpoint: request.url,
    ...additional,
  };
}

/**
 * Formats log message with request ID and context
 */
export function formatLogMessage(message: string, context?: LogContext): string {
  if (!context || !context.reqId) {
    return message;
  }

  const parts = [message, `[req: ${context.reqId}]`];

  if (context.userId) {
    parts.push(`[user: ${context.userId}]`);
  }

  return parts.join(' ');
}

/**
 * Logs info message with request ID
 */
export function logInfo(
  request: FastifyRequest,
  message: string,
  context?: LogContext
): void {
  const logContext = createLogContext(request, context);
  const formattedMessage = formatLogMessage(message, logContext);
  request.log?.info?.(formattedMessage);
}

/**
 * Logs error message with request ID
 */
export function logError(
  request: FastifyRequest,
  message: string,
  error?: Error | unknown,
  context?: LogContext
): void {
  const logContext = createLogContext(request, context);
  const formattedMessage = formatLogMessage(message, logContext);

  if (error instanceof Error) {
    request.log?.error?.({ err: error }, formattedMessage);
  } else if (error) {
    request.log?.error?.({ error }, formattedMessage);
  } else {
    request.log?.error?.(formattedMessage);
  }
}

/**
 * Logs warning message with request ID
 */
export function logWarning(
  request: FastifyRequest,
  message: string,
  context?: LogContext
): void {
  const logContext = createLogContext(request, context);
  const formattedMessage = formatLogMessage(message, logContext);
  request.log?.warn?.(formattedMessage);
}
