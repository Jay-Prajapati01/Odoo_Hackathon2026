import { httpStatus } from './http-status';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(statusCode: number, message: string, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
    super(httpStatus.BAD_REQUEST, message, code);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(httpStatus.UNAUTHORIZED, message, code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(httpStatus.FORBIDDEN, message, code);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(httpStatus.NOT_FOUND, message, code);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(httpStatus.CONFLICT, message, code);
  }
}

export class ValidationError extends ApiError {
  public readonly details?: unknown;
  constructor(message = 'Validation Error', details?: unknown, code = 'VALIDATION_ERROR') {
    super(httpStatus.UNPROCESSABLE_ENTITY, message, code);
    this.details = details;
  }
}

export class BusinessRuleError extends ApiError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super(httpStatus.UNPROCESSABLE_ENTITY, message, code);
  }
}
