import type { Request, Response } from 'express';
import type { IncomingHttpHeaders } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logRequests, requestId } from '../../src/express';

const createReq = (overrides: Partial<Request> = {}): Request => {
  const headers: IncomingHttpHeaders =
    (overrides.headers as IncomingHttpHeaders | undefined) ?? { 'x-request-id': undefined };

  const getHeader = (name: string): string | string[] | undefined => {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value;
    return undefined;
  };

  const getSingleHeaderValue = (name: string): string | undefined => {
    const value = getHeader(name);
    return Array.isArray(value) ? value[0] : value;
  };

  const headerFn: Request['header'] = ((name: string) => {
    if (name.toLowerCase() === 'set-cookie') {
      const value = getHeader(name);
      if (!value) return undefined;
      return Array.isArray(value) ? value : [value];
    }
    return getSingleHeaderValue(name);
  }) as Request['header'];

  const request = {
    method: 'GET',
    url: '/ping',
    originalUrl: '/ping',
    ...overrides,
  } as Request;
  request.headers = headers;
  request.get = overrides.get ?? (((name: string) => getSingleHeaderValue(name)) as Request['get']);
  request.header = overrides.header ?? headerFn;
  return request;
};

const createRes = (): Response & {
  emit: (event: string, ...args: unknown[]) => void;
} => {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return {} as Response;
    }),
    emit: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach((cb) => cb(...args));
    },
  };
  return res as unknown as Response & { emit: (event: string, ...args: unknown[]) => void };
};

describe('requestId middleware', () => {
  it('trusts incoming header by default', async () => {
    const req = createReq({ headers: { 'x-request-id': 'abc-123' } });
    const res = createRes();
    const mw = requestId();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req).toMatchObject({ id: 'abc-123' });
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-123');
  });

  it('generates id when trustIncoming is false', async () => {
    const generate = vi.fn(() => 'generated-id');
    const req = createReq({ headers: { 'x-request-id': 'abc-123' } });
    const res = createRes();
    const mw = requestId({ trustIncoming: false, generator: generate });
    const next = vi.fn();
    await mw(req, res, next);
    expect(generate).toHaveBeenCalled();
    expect(req).toMatchObject({ id: 'generated-id' });
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'generated-id');
  });
});

describe('logRequests middleware', () => {
  const logger = { info: vi.fn() };

  beforeEach(() => {
    logger.info.mockClear();
  });

  it('logs on response finish', async () => {
    const req = createReq({ method: 'GET', url: '/health', originalUrl: '/health' });
    (req as Request & { id?: string }).id = 'rid-1';
    const res = createRes();
    const mw = logRequests({ logger });
    const next = vi.fn();
    await mw(req, res, next);
    res.emit('finish');
    expect(logger.info).toHaveBeenCalledTimes(1);
    const [payload, message] = logger.info.mock.calls[0];
    expect(message).toBe('request');
    expect(payload).toMatchObject({
      id: 'rid-1',
      method: 'GET',
      url: '/health',
      status: 200,
    });
    expect(typeof payload.duration).toBe('number');
  });
});
