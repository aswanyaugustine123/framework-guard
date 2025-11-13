import jwt, { type Secret, type SignOptions, type VerifyOptions } from 'jsonwebtoken';

export type JwtPayload = Record<string, unknown>;

type HeaderDictionary = Record<string, string | string[] | undefined>;

const normalizeHeaderValue = (value?: string | string[]): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

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

export function defaultGetToken<Req extends { headers?: HeaderDictionary }>(req: Req): string | null {
  const headers = req.headers ?? {};
  const headerValue = normalizeHeaderValue(headers.authorization ?? headers.Authorization);
  return getTokenFromAuthHeader(headerValue);
}
