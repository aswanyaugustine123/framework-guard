import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet, { type HelmetOptions } from 'helmet';
import type jwt from 'jsonwebtoken';
import type { ZodSchema } from 'zod';
import { defaultGetToken, verifyJwt } from './core/auth';
import { AppError, toHttpError } from './core/error';
import { jsonError } from './core/response';
import { ErrorCodes } from './core/codes';

export interface JwtAuthOptions<TUser = any> {
  secret: jwt.Secret;
  algorithms?: jwt.Algorithm[];
  credentialsRequired?: boolean; // default true
  getToken?: (req: Request) => string | null;
  requestProperty?: string; // default 'user'
}

export function jwtAuth<TUser = any>(options: JwtAuthOptions<TUser>): RequestHandler {
  const {
    secret,
    algorithms,
    credentialsRequired = true,
    getToken = defaultGetToken,
    requestProperty = 'user',
  } = options;

  return function jwtAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    const token = getToken(req);
    if (!token) {
      if (credentialsRequired) return next(new AppError('Unauthorized', 401, ErrorCodes.UNAUTHORIZED));
      return next();
    }
    try {
      const payload = verifyJwt<TUser>(token, secret, { algorithms });
      (req as any)[requestProperty] = payload;
      return next();
    } catch {
      return next(new AppError('Invalid token', 401, ErrorCodes.INVALID_TOKEN));
    }
  };
}

export function notFound(): RequestHandler {
  return function notFoundHandler(_req: Request, res: Response) {
    res.status(404).json(jsonError('Not Found', ErrorCodes.NOT_FOUND));
  };
}

export function errorHandler(): ErrorRequestHandler {
  return function errorHandlerMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    const httpErr = toHttpError(err);
    const status = httpErr.status || 500;
    res.status(status).json(jsonError(httpErr.message, httpErr.code, httpErr.details));
  };
}

export function withCors(options?: CorsOptions): RequestHandler {
  return cors(options) as unknown as RequestHandler;
}

export function withHelmet(options?: HelmetOptions): RequestHandler {
  return helmet(options) as unknown as RequestHandler;
}

export interface RequestIdOptions {
  header?: string; // default 'X-Request-Id'
  trustIncoming?: boolean; // default true
  generator?: () => string; // default crypto.randomUUID
  requestProperty?: string; // default 'id'
}

export function requestId(options: RequestIdOptions = {}): RequestHandler {
  const {
    header = 'X-Request-Id',
    trustIncoming = true,
    generator = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    requestProperty = 'id',
  } = options;

  const headerLower = header.toLowerCase();

  return function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const incoming = (req.headers as any)[headerLower] as string | undefined;
    const id = trustIncoming && incoming ? String(incoming) : generator();
    (req as any)[requestProperty] = id;
    res.setHeader(header, id);
    next();
  };
}

export interface LogRequestsOptions {
  header?: string; // request id header name
  logger?: { info: (...args: any[]) => void; error?: (...args: any[]) => void; warn?: (...args: any[]) => void };
  level?: 'info' | 'debug';
}

export function logRequests(options: LogRequestsOptions = {}): RequestHandler {
  const { header = 'X-Request-Id', logger = console } = options;
  const headerLower = header.toLowerCase();
  return function logRequestsMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const id = ((req as any).id as string) || ((req.headers as any)[headerLower] as string) || undefined;
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      logger.info?.({ id, method: req.method, url: req.originalUrl || req.url, status, duration }, 'request');
    });
    next();
  };
}

export interface ValidateSchemas<TBody = any, TQuery = any, TParams = any> {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}

export function validate<TBody = any, TQuery = any, TParams = any>(schemas: ValidateSchemas<TBody, TQuery, TParams>): RequestHandler {
  return function validateMiddleware(req: Request, _res: Response, next: NextFunction) {
    const details: any = {};

    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse((req as any).body);
        if (!parsed.success) details.body = parsed.error.issues.map(i => ({ path: i.path, message: i.message }));
        else (req as any).body = parsed.data;
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse((req as any).query);
        if (!parsed.success) details.query = parsed.error.issues.map(i => ({ path: i.path, message: i.message }));
        else (req as any).query = parsed.data as any;
      }
      if (schemas.params) {
        const parsed = schemas.params.safeParse((req as any).params);
        if (!parsed.success) details.params = parsed.error.issues.map(i => ({ path: i.path, message: i.message }));
        else (req as any).params = parsed.data as any;
      }
    } catch (e) {
      return next(new AppError('Validation failed', 400, ErrorCodes.VALIDATION));
    }

    if (Object.keys(details).length > 0) {
      return next(new AppError('Validation failed', 400, ErrorCodes.VALIDATION, details));
    }

    return next();
  };
}
