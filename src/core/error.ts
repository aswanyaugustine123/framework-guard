export class AppError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
    };
  }
}

type ErrorLike = { name?: unknown };

export function isAppError(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  if (!err || typeof err !== 'object') return false;
  return (err as ErrorLike).name === 'AppError';
}

export function toHttpError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) return new AppError(err.message, 500);
  return new AppError('Internal Server Error', 500);
}
