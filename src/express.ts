import cors, { type CorsOptions } from 'cors';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import helmet, { type HelmetOptions } from 'helmet';
import type jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { ZodSchema } from 'zod';
import { defaultGetToken, verifyJwt, type JwtPayload } from './core/auth';
import { ErrorCodes } from './core/codes';
import { AppError, toHttpError } from './core/error';
import { jsonError } from './core/response';

type MutableRequest = Request & Record<string, unknown>;
type RequestSection = 'body' | 'query' | 'params';

const asMutableRequest = (req: Request): MutableRequest => req as MutableRequest;

const setRequestSection = (req: Request, section: RequestSection, value: unknown): void => {
  asMutableRequest(req)[section] = value;
};

const readRequestSection = (req: Request, section: RequestSection): unknown => {
  return asMutableRequest(req)[section];
};

const setRequestProperty = (req: Request, property: string, value: unknown): void => {
  asMutableRequest(req)[property] = value;
};

const getRequestProperty = <T>(req: Request, property: string): T | undefined => {
  return asMutableRequest(req)[property] as T | undefined;
};

const readHeaderValue = (req: Request, headerName: string): string | undefined => {
  const direct = req.get(headerName);
  if (direct) return direct;
  const raw = req.headers[headerName.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string') return raw;
  return undefined;
};

const randomId = (): string => {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

export interface JwtAuthOptions {
  secret: jwt.Secret;
  algorithms?: jwt.Algorithm[];
  credentialsRequired?: boolean; // default true
  getToken?: (req: Request) => string | null;
  requestProperty?: string; // default 'user'
}

export function jwtAuth<TPayload = JwtPayload>(options: JwtAuthOptions): RequestHandler {
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
      const payload = verifyJwt<TPayload>(token, secret, { algorithms });
      setRequestProperty(req, requestProperty, payload);
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
    generator = randomId,
    requestProperty = 'id',
  } = options;

  return function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const incoming = trustIncoming ? readHeaderValue(req, header) : undefined;
    const id = incoming ?? generator();
    setRequestProperty(req, requestProperty, id);
    res.setHeader(header, id);
    next();
  };
}

export interface LoggerLike {
  info?: (payload: Record<string, unknown>, message?: string) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface LogRequestsOptions {
  header?: string; // request id header name
  logger?: LoggerLike;
}

export function logRequests(options: LogRequestsOptions = {}): RequestHandler {
  const { header = 'X-Request-Id', logger = console } = options;
  return function logRequestsMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const id = getRequestProperty<string>(req, 'id') ?? readHeaderValue(req, header);
      logger.info?.({ id, method: req.method, url: req.originalUrl ?? req.url, status, duration }, 'request');
    });
    next();
  };
}

type ValidationIssue = { path: (string | number)[]; message: string };
type ValidationDetails = Partial<Record<RequestSection, ValidationIssue[]>>;

export interface ValidateSchemas<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}

export function validate<TBody = unknown, TQuery = unknown, TParams = unknown>(
  schemas: ValidateSchemas<TBody, TQuery, TParams>
): RequestHandler {
  return function validateMiddleware(req: Request, _res: Response, next: NextFunction) {
    const details: ValidationDetails = {};

    const applySchema = <T>(schema: ZodSchema<T>, section: RequestSection) => {
      const parsed = schema.safeParse(readRequestSection(req, section));
      if (!parsed.success) {
        details[section] = parsed.error.issues.map(({ path, message }) => ({ path, message }));
        return;
      }
      setRequestSection(req, section, parsed.data);
    };

    try {
      if (schemas.body) applySchema(schemas.body, 'body');
      if (schemas.query) applySchema(schemas.query, 'query');
      if (schemas.params) applySchema(schemas.params, 'params');
    } catch {
      return next(new AppError('Validation failed', 400, ErrorCodes.VALIDATION));
    }

    if (Object.keys(details).length > 0) {
      return next(new AppError('Validation failed', 400, ErrorCodes.VALIDATION, details));
    }

    return next();
  };
}
