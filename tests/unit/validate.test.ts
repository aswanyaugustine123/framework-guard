import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ErrorCodes } from '../../src/core/codes';
import { validate } from '../../src/express';

const createReq = (overrides: Partial<Request> = {}): Request =>
  ({
    body: {},
    query: {},
    params: {},
    headers: {},
    method: 'POST',
    url: '/test',
    ...overrides,
  }) as Request;

const createRes = (overrides: Partial<Response> = {}): Response => {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return {} as Response;
    }),
    emit: (event: string, ...args: unknown[]) => {
      listeners[event]?.forEach((cb) => cb(...args));
    },
    ...overrides,
  } as unknown as Response & { emit: (event: string, ...args: unknown[]) => void };
};

describe('validate middleware', () => {
  it('coerces body/query/params when schemas succeed', async () => {
    const mw = validate({
      body: z.object({ message: z.string().min(1) }),
      query: z.object({ flag: z.enum(['yes', 'no']).default('yes') }),
      params: z.object({ id: z.coerce.number() }),
    });
    const req = createReq({
      body: { message: 'hi' },
      query: {},
      params: { id: '42' },
    });
    const res = createRes();
    const next = vi.fn<Parameters<NextFunction>, void>();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ message: 'hi' });
    expect(req.query).toEqual({ flag: 'yes' });
    expect(req.params).toEqual({ id: 42 });
  });

  it('bubbles an AppError with validation details on failure', async () => {
    const schema = z.object({ message: z.string().min(3) });
    const mw = validate({ body: schema });
    const req = createReq({ body: { message: 'x' } });
    const res = createRes();
    const next = vi.fn<Parameters<NextFunction>, void>();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    const [err] = next.mock.calls.at(-1)!;
    expect(err).toMatchObject({
      status: 400,
      code: ErrorCodes.VALIDATION,
    });
    expect(err.details?.body?.[0]?.message).toMatch(/at least 3/i);
  });
});
