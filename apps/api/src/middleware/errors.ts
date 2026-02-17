/**
 * Error response utilities
 * Provides consistent, user-friendly error messages
 * while logging detailed information server-side
 */

import { FastifyReply, FastifyRequest } from 'fastify';

export interface ErrorResponse {
  error: string;
  code?: string;
  timestamp?: string;
  details?: any;
}

/**
 * Sends a user-friendly error response with detailed server logging
 */
export function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  statusCode: number,
  userMessage: string,
  errorCode?: string,
  internalDetails?: any
): void {
  const response: ErrorResponse = {
    error: userMessage,
    timestamp: new Date().toISOString(),
  };

  if (errorCode) {
    response.code = errorCode;
  }

  // Log detailed error info server-side with request ID
  const logDetails = {
    reqId: request.id,
    statusCode,
    userMessage,
    errorCode,
    ...internalDetails,
  };

  if (statusCode >= 500) {
    request.log?.error?.(logDetails);
  } else if (statusCode >= 400) {
    request.log?.warn?.(logDetails);
  }

  reply.code(statusCode).send(response);
}

/**
 * Common error helpers
 */
export const Errors = {
  // 400 errors
  invalidInput: (reply: FastifyReply, request: FastifyRequest, details?: any) => {
    sendError(reply, request, 400, 'Invalid input. Please check your data and try again.', 'INVALID_INPUT', details);
  },

  missingField: (reply: FastifyReply, request: FastifyRequest, fieldName: string) => {
    sendError(reply, request, 400, `Missing required field: ${fieldName}`, 'MISSING_FIELD', { field: fieldName });
  },

  usernameTaken: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 400, 'Username is already taken. Please choose another.', 'USERNAME_TAKEN');
  },

  emailTaken: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 400, 'Email is already registered. Please log in instead.', 'EMAIL_TAKEN');
  },

  invalidCredentials: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 401, 'Invalid username or password. Please try again.', 'INVALID_CREDENTIALS');
  },

  captchaFailed: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 400, 'CAPTCHA verification failed. Please try again.', 'CAPTCHA_FAILED');
  },

  // 401 errors
  unauthorized: (reply: FastifyReply, request: FastifyRequest, reason?: string) => {
    sendError(reply, request, 401, 'You must be logged in to perform this action.', 'UNAUTHORIZED', { reason });
  },

  tokenExpired: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 401, 'Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
  },

  // 403 errors
  forbidden: (reply: FastifyReply, request: FastifyRequest, reason?: string) => {
    sendError(reply, request, 403, 'You do not have permission to perform this action.', 'FORBIDDEN', { reason });
  },

  notAdmin: (reply: FastifyReply, request: FastifyRequest) => {
    sendError(reply, request, 403, 'This action is only available to administrators.', 'NOT_ADMIN');
  },

  // 404 errors
  notFound: (reply: FastifyReply, request: FastifyRequest, resource: string) => {
    sendError(reply, request, 404, `${resource} not found.`, 'NOT_FOUND', { resource });
  },

  // 500 errors
  serverError: (reply: FastifyReply, request: FastifyRequest, operation: string, error?: any) => {
    sendError(reply, request, 500, 'An unexpected error occurred. Please try again later.', 'SERVER_ERROR', {
      operation,
      originalError: error instanceof Error ? error.message : String(error),
    });
  },

  databaseError: (reply: FastifyReply, request: FastifyRequest, operation: string, error?: any) => {
    sendError(reply, request, 500, 'Database error. Please try again later.', 'DATABASE_ERROR', {
      operation,
      originalError: error instanceof Error ? error.message : String(error),
    });
  },

  externalServiceError: (reply: FastifyReply, request: FastifyRequest, service: string) => {
    sendError(reply, request, 503, `${service} is temporarily unavailable. Please try again later.`, 'SERVICE_UNAVAILABLE', { service });
  },
};
