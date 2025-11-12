import jwt, { type Secret, type SignOptions, type VerifyOptions } from 'jsonwebtoken';

export type JwtPayload = Record<string, any>;

export function getTokenFromAuthHeader(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (/^bearer\s+/i.test(trimmed)) return trimmed.replace(/^bearer\s+/i, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function signJwt<T extends object = JwtPayload>(
  payload: T,
  secret: Secret,
  options?: SignOptions
): string {
  return jwt.sign(payload, secret, options);
}

export function verifyJwt<T = JwtPayload>(
  token: string,
  secret: Secret,
  options?: VerifyOptions
): T {
  return jwt.verify(token, secret, options) as T;
}

export interface ExtractTokenOptions<Req = any> {
  getToken?: (req: Req) => string | null;
}

export function defaultGetToken<Req extends { headers?: any }>(req: Req): string | null {
  const header = req?.headers?.authorization ?? req?.headers?.Authorization;
  return getTokenFromAuthHeader(header);
}

