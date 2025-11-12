export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function jsonSuccess<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function jsonError(message: string, code?: string, details?: unknown): ErrorResponse {
  return { success: false, error: { message, code, details } };
}

