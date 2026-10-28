export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request', code = 'BAD_REQUEST', details?: unknown) {
    super(400, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient balance for this transaction', code = 'INSUFFICIENT_FUNDS') {
    super(422, code, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred', code = 'INTERNAL_SERVER_ERROR') {
    super(500, code, message);
  }
}
