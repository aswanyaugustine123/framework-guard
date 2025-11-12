import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors, { type CorsOptions } from 'cors';
import type jwt from 'jsonwebtoken';
import { defaultGetToken, verifyJwt } from './core/auth';
import { AppError, toHttpError } from './core/error';
import { jsonError } from './core/response';

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
      if (credentialsRequired) return next(new AppError('Unauthorized', 401, 'ERR_UNAUTHORIZED'));
      return next();
    }
    try {
      const payload = verifyJwt<TUser>(token, secret, { algorithms });
      (req as any)[requestProperty] = payload;
      return next();
    } catch {
      return next(new AppError('Invalid token', 401, 'ERR_INVALID_TOKEN'));
    }
  };
}

export function notFound(): RequestHandler {
  return function notFoundHandler(_req: Request, res: Response) {
    res.status(404).json(jsonError('Not Found', 'ERR_NOT_FOUND'));
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

