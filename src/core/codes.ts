export const ErrorCodes = {
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  INVALID_TOKEN: 'ERR_INVALID_TOKEN',
  NOT_FOUND: 'ERR_NOT_FOUND',
  VALIDATION: 'ERR_VALIDATION',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

