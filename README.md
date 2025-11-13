# framework-guard

[![npm version](https://img.shields.io/npm/v/framework-guard.svg)](https://www.npmjs.com/package/framework-guard)
[![CI](https://github.com/aswanyaugustine123/framework-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/aswanyaugustine123/framework-guard/actions/workflows/ci.yml)
![types](https://img.shields.io/badge/types-TypeScript-blue)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

`framework-guard` is an Express-first middleware toolkit that ships JWT auth, error handling, logging, security headers, and Zod validation in one cohesive package. The library builds as native ESM (with CommonJS compatibility) and includes full TypeScript types.

## Features

- JWT auth middleware (+ helpers `signJwt`, `verifyJwt`) with customizable token extraction and request attachment.
- Resilient error surface via `AppError`, `errorHandler`, `notFound`, and JSON response helpers.
- Security middleware wrappers (`withCors`, `withHelmet`) and request observability (`requestId`, `logRequests`).
- Zod-powered validation (`validate`) for `body`, `query`, and `params`.
- Dual ESM/CJS bundles, declaration files, and sourcemaps generated via `tsup`.

## Requirements

- Node.js ≥ 20 (tested on Node 20.x and 22.x in CI). An `.nvmrc` is included for local parity.
- npm ≥ 10 (or pnpm/yarn with the equivalent lifecycle scripts).
- TypeScript 5.6+ if you consume the source types directly.

## Installation

```bash
npm install framework-guard express jsonwebtoken cors helmet zod
```

For contributors:

```bash
npm install
npm run verify
```

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Enables production optimizations in Express and logging | `production` |
| `JWT_SECRET` | Symmetric secret (or base64) for signing/verifying tokens | `super-secret-value` |
| `LOG_LEVEL` | Propagated to your logger (`pino`, etc.) | `info` |
| `REQUEST_ID_HEADER` | Override default `X-Request-Id` header name | `X-Correlation-Id` |
| `TRUST_REQUEST_ID` | Set to `false` to always mint IDs instead of trusting headers | `false` |
| `CORS_ORIGINS` | Supply comma-separated origins when composing `withCors()` | `https://app.example.com` |

Document these in your README or `.env.example` when publishing downstream packages.

## Available Scripts

- `npm run build` – clean + bundle ESM/CJS artifacts via tsup (targeting Node 22).
- `npm run lint` – ESLint with `@typescript-eslint` and import ordering rules.
- `npm run type-check` – `tsc --noEmit` for strict typing.
- `npm run test` – Vitest (unit + integration). Split commands exist as `test:unit` / `test:integration`.
- `npm run verify` – Convenience script (lint + type-check + tests) used in CI and `prepublishOnly`.
- `npm run example:express` – Runs the Express sample at `examples/express-basic.ts`.
- `npm run release` – Executes `semantic-release` (invoked by GitHub Actions `release.yml`).
- `npm run audit` – Fails fast on high-severity vulnerabilities via `npm audit --audit-level=high`.

## Usage

### Express API

```ts
import express from 'express';
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
} from 'framework-guard';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';
const app = express();

app.use(express.json());
app.use(withCors());
app.use(withHelmet());
app.use(requestId());
app.use(logRequests({ logger }));

app.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) {
    return res.status(400).json({ success: false, error: { message: 'username required' } });
  }
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

const echoBody = z.object({ message: z.string().min(1) });
app.post('/api/echo', validate({ body: echoBody }), (req, res) => {
  res.json({ success: true, data: { body: req.body, user: (req as any).user } });
});

app.use(notFound());
app.use(errorHandler());

app.listen(3000, () => logger.info('listening on http://localhost:3000'));
```

### Serverless / Edge usage

The same middleware composes nicely in serverless runtimes (Vercel, AWS Lambda, Cloudflare Workers with adapters). Example with Vercel’s `@vercel/node` entry:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import serverlessHttp from 'serverless-http';
import { requestId, logRequests, withCors, errorHandler, notFound } from 'framework-guard';

const app = express();
app.use(express.json());
app.use(requestId());
app.use(logRequests({ logger: console }));
app.use(withCors());
// register routes + middleware
app.use(notFound());
app.use(errorHandler());

const handler = serverlessHttp(app);
export default (req: VercelRequest, res: VercelResponse) => handler(req, res);
```

For AWS Lambda or Docker images, pair the middleware with your preferred adapter (e.g., `aws-serverless-express`, `@apollo/server`). Ensure `NODE_ENV=production`, and set `LOG_LEVEL` / `JWT_SECRET` through your secret manager of choice.

## Testing Strategy

- Unit tests live under `tests/unit` and mock Express primitives to focus on middleware behavior.
- Integration tests (see `tests/integration/middleware-stack.spec.ts`) spin up an actual Express app, run Supertest through JWT/validation stacks, and assert real HTTP responses.
- Run `npm run test:unit`, `npm run test:integration`, or `npm run test` (all suites). CI executes both plus lint/type-check/build/audit on every push and PR.

## Documentation & OpenAPI

- `docs/production-checklist.md` captures the full production-hardening checklist (Node/TypeScript setup, testing, security).
- `docs/openapi.md` (coming from `zod-openapi`) documents how to generate `openapi.json` directly from your Zod schemas and validate requests/responses with `express-openapi-validator`.
- Link to your spec (e.g., `/openapi.json`) in downstream READMEs and optionally serve Swagger UI or Redoc at `/docs`.

## Security, Performance & Observability

- Use structured logging (Pino) instead of `console.log` to avoid synchronous stdio in production. The `logRequests` middleware accepts any logger with an `info` method.
- Keep middleware async-friendly—do not add blocking operations or synchronous crypto in hot paths. Offload CPU-heavy work to job queues/workers.
- Run `npm run audit` regularly and enable Dependabot/Snyk for dependency drift.
- Set security headers via `withHelmet`, configure strict CORS with `withCors`, and keep JWT secrets in a secret manager (never committed).
- Run behind a proxy (NGINX, Cloudflare) for TLS, caching, and gzip/Brotli compression. Document expected proxy headers (`X-Forwarded-*`).

## Release & CI

- `.github/workflows/ci.yml` runs lint → type-check → unit + integration tests → build → audit across Node 20.x/22.x.
- `.github/workflows/release.yml` listens for successful CI runs on `main` and executes `semantic-release`, which bumps versions, updates `CHANGELOG.md`, publishes to npm, and tags Git.
- Versioning follows SemVer with Conventional Commits. Start at `1.0.0` for the first stable release, and document breaking changes plus migration notes in the changelog.

## Contributing & Support

- See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow details.
- Security issues? Please open a private advisory via GitHub Security Advisories or email the maintainer listed in `package.json`.
- For a deeper production hardening guide, read [docs/production-checklist.md](docs/production-checklist.md).
