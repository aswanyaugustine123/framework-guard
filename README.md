# framework-guard

Toolkit for building HTTP middleware with a focus on Express: JWT auth, consistent error handling, and response helpers.

## Installation

For consumers:

```
npm install framework-guard express jsonwebtoken cors
```

For development (this repo):

```
npm install
npm run build
```

Requires Node >= 18.

## Quick Start (Express)

```ts
import express from 'express';
import { withCors, jwtAuth, notFound, errorHandler, signJwt } from 'framework-guard';

const app = express();
app.use(express.json());
app.use(withCors());

// Issue a token (example only)
app.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) return res.status(400).json({ success: false, error: { message: 'username required' } });

  const token = signJwt({ sub: username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });
  res.json({ success: true, data: { token } });
});

// Protect routes with JWT
app.use(
  '/api',
  jwtAuth({
    secret: process.env.JWT_SECRET || 'dev-secret',
    algorithms: ['HS256'],
    requestProperty: 'user',
  })
);

app.get('/api/me', (req, res) => {
  res.json({ success: true, data: { user: (req as any).user } });
});

app.use(notFound());
app.use(errorHandler());

app.listen(3000, () => console.log('listening on http://localhost:3000'));
```

## API Overview

- `jwtAuth(options)`: Express middleware to validate JWT and attach payload to `req[requestProperty]`.
- `notFound()`: 404 JSON responder.
- `errorHandler()`: Normalizes errors to JSON; handles `AppError` instances.
- `withCors(options)`: Thin wrapper over `cors()` as a standard middleware.
- `signJwt(payload, secret, options)`: Helper for issuing tokens.
- `verifyJwt(token, secret, options)`: Helper for verifying tokens.
- `AppError`: Custom error with `status`, `code`, `details`.

## Development

- Build: `npm run build`
- Dev (watch): `npm run dev`
- Type check: `npm run typecheck`

## New Core Middlewares

- withHelmet(options)
  - Wrapper around `helmet()` to apply secure HTTP headers.
- requestId(options)
  - Adds a request ID to `req.id` and sets `X-Request-Id` response header.
  - Options: `{ header = 'X-Request-Id', trustIncoming = true, requestProperty = 'id' }`.
- logRequests(options)
  - Logs method, URL, status, and duration; includes request ID if present.
  - Options: `{ header = 'X-Request-Id', logger = console }`.
- validate({ body, query, params })
  - Zod-powered validation. Replaces `req.body/query/params` with parsed values.
  - On failure: returns 400 via `AppError` with code `ERR_VALIDATION` and issue details.
- ErrorCodes
  - Catalog of common error codes: `ERR_UNAUTHORIZED`, `ERR_INVALID_TOKEN`, `ERR_NOT_FOUND`, `ERR_VALIDATION`.

### Updated Example

```ts
import express from 'express';
import { z } from 'zod';
import { withCors, withHelmet, requestId, logRequests, validate, jwtAuth, notFound, errorHandler, signJwt } from 'framework-guard';

const app = express();
app.use(express.json());
app.use(withCors());
app.use(withHelmet());
app.use(requestId());
app.use(logRequests());

app.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) return res.status(400).json({ success: false, error: { message: 'username required' } });
  const token = signJwt({ sub: username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });
  res.json({ success: true, data: { token } });
});

app.use('/api', jwtAuth({ secret: process.env.JWT_SECRET || 'dev-secret', algorithms: ['HS256'], requestProperty: 'user' }));

app.get('/api/me', (req, res) => {
  res.json({ success: true, data: { user: (req as any).user } });
});

const echoBody = z.object({ message: z.string().min(1) });
app.post('/api/echo', validate({ body: echoBody }), (req, res) => {
  res.json({ success: true, data: { body: req.body } });
});

app.use(notFound());
app.use(errorHandler());

app.listen(3000, () => console.log('listening on http://localhost:3000'));
```
