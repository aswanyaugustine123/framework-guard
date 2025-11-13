import { strict as assert } from 'node:assert';
import { z } from 'zod';
import {
  requestId,
  logRequests,
  validate,
} from '../src/express';
import { ErrorCodes } from '../src/core/codes';
import type { Request, Response, NextFunction } from 'express';

type Next = (err?: any) => void;

function createReq(init: Partial<Request> = {}): Request {
  return {
    headers: {},
    method: 'GET',
    url: '/test',
    ...init,
  } as unknown as Request;
}

function createRes(init: Partial<Response> = {}) {
  const listeners: Record<string, Function[]> = {};
  const res = {
    statusCode: 200,
    setHeader: (name: string, value: any) => {
      (res as any)._headers = (res as any)._headers || {};
      (res as any)._headers[name] = value;
    },
    getHeader: (name: string) => (res as any)._headers?.[name],
    on: (event: string, cb: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((cb) => cb(...args));
    },
    ...init,
  } as unknown as Response & { emit: (event: string, ...args: any[]) => void };
  return res;
}

async function runMiddleware(mw: (req: Request, res: Response, next: NextFunction) => void, req: Request, res: Response) {
  return new Promise<{ err?: any }>((resolve) => {
    const next: Next = (err?: any) => resolve({ err });
    mw(req, res, next as NextFunction);
  });
}

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

await test('validate() succeeds and coerces body', async () => {
  const schema = z.object({ message: z.string().min(1) });
  const mw = validate({ body: schema });
  const req = createReq({ body: { message: 'hi' } });
  const res = createRes();
  const { err } = await runMiddleware(mw, req, res);
  assert.equal(err, undefined);
  assert.deepEqual((req as any).body, { message: 'hi' });
});

await test('validate() fails with ERR_VALIDATION and details', async () => {
  const schema = z.object({ message: z.string().min(2) });
  const mw = validate({ body: schema });
  const req = createReq({ body: { message: 'x' } });
  const res = createRes();
  const { err } = await runMiddleware(mw, req, res);
  assert.ok(err, 'Expected an error');
  assert.equal(err.status, 400);
  assert.equal(err.code, ErrorCodes.VALIDATION);
  assert.ok(err.details?.body?.length >= 1);
});

await test('requestId() trusts incoming header by default', async () => {
  const mw = requestId();
  const req = createReq({ headers: { 'x-request-id': 'abc-123' } as any });
  const res = createRes();
  await runMiddleware(mw, req, res);
  assert.equal((req as any).id, 'abc-123');
  assert.equal((res as any).getHeader('X-Request-Id'), 'abc-123');
});

await test('requestId() can generate new id when trustIncoming=false', async () => {
  const mw = requestId({ trustIncoming: false, generator: () => 'gen-1' });
  const req = createReq({ headers: { 'x-request-id': 'abc-123' } as any });
  const res = createRes();
  await runMiddleware(mw, req, res);
  assert.equal((req as any).id, 'gen-1');
  assert.equal((res as any).getHeader('X-Request-Id'), 'gen-1');
});

await test('logRequests() logs on finish with request id', async () => {
  const events: any[] = [];
  const logger = { info: (...args: any[]) => events.push(args) };
  const mw = logRequests({ logger });
  const req = createReq({ method: 'GET', url: '/foo' });
  (req as any).id = 'rid-1';
  const res = createRes({});
  res.statusCode = 200;
  await runMiddleware(mw, req, res);
  (res as any).emit('finish');
  assert.equal(events.length, 1);
  const [payload, msg] = events[0];
  assert.equal(msg, 'request');
  assert.equal(payload.id, 'rid-1');
  assert.equal(payload.method, 'GET');
  assert.equal(payload.url, '/foo');
  assert.equal(payload.status, 200);
  assert.ok(typeof payload.duration === 'number');
});

console.log('All tests passed');

