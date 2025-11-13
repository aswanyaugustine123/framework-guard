import express from 'express';
import type { Request } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  errorHandler,
  jwtAuth,
  logRequests,
  requestId,
  signJwt,
  validate,
  withCors,
  withHelmet,
  notFound,
} from '../../src';

const JWT_SECRET = 'integration-secret';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(withCors());
  app.use(withHelmet());
  app.use(requestId());
  app.use(logRequests({ logger: { info: () => undefined } }));

  const echoBody = z.object({ message: z.string().min(1) });

  app.post(
    '/api/echo',
    jwtAuth({ secret: JWT_SECRET, algorithms: ['HS256'], requestProperty: 'user' }),
    validate({ body: echoBody }),
    (req, res) => {
      const authedReq = req as Request & { user?: unknown };
      res.json({
        success: true,
        data: {
          body: req.body,
          user: authedReq.user,
        },
      });
    },
  );

  app.use(notFound());
  app.use(errorHandler());
  return app;
};

describe('framework-guard middleware stack', () => {
  it('rejects requests with missing token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/echo').send({ message: 'hi' }).expect(401);
    expect(res.body.error.code).toBe('ERR_UNAUTHORIZED');
  });

  it('validates body and surfaces payload when token is valid', async () => {
    const token = signJwt({ sub: 'user-1' }, JWT_SECRET, { algorithm: 'HS256' });
    const app = createApp();
    const res = await request(app)
      .post('/api/echo')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'from integration' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.body).toEqual({ message: 'from integration' });
    expect(res.body.data.user).toMatchObject({ sub: 'user-1' });
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist').expect(404);
    expect(res.body.error.code).toBe('ERR_NOT_FOUND');
  });
});
