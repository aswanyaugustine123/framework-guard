import express from 'express';
import type { Request } from 'express';
import pino from 'pino';
import { z } from 'zod';
import {
  errorHandler,
  jwtAuth,
  logRequests,
  notFound,
  requestId,
  signJwt,
  validate,
  withCors,
  withHelmet,
} from '../src';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());
app.use(withCors());
app.use(withHelmet());
app.use(
  requestId({
    header: process.env.REQUEST_ID_HEADER ?? 'X-Request-Id',
    trustIncoming: process.env.TRUST_REQUEST_ID !== 'false',
  }),
);
app.use(logRequests({ logger }));

app.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) return res.status(400).json({ success: false, error: { message: 'username required' } });
  const token = signJwt({ sub: username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, data: { token } });
});

app.use(
  '/api',
  jwtAuth({
    secret: JWT_SECRET,
    algorithms: ['HS256'],
    requestProperty: 'user',
  }),
);

app.get('/api/me', (req, res) => {
  const authedReq = req as Request & { user?: unknown; id?: string };
  res.json({ success: true, data: { user: authedReq.user, requestId: authedReq.id } });
});

const echoBody = z.object({ message: z.string().min(1) });
app.post('/api/echo', validate({ body: echoBody }), (req, res) => {
  res.json({ success: true, data: { body: req.body } });
});

app.use(notFound());
app.use(errorHandler());

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'HTTP server ready');
});
