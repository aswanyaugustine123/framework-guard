# OpenAPI + Validation Guide

`framework-guard` already centralizes validation through Zod schemas. This document shows how to reuse those schemas to generate OpenAPI documents and enforce them at runtime.

## 1. Generate OpenAPI from Zod

```ts
import { createDocument } from 'zod-openapi';
import { z } from 'zod';

const EchoBody = z.object({ message: z.string().min(1).openapi({ example: 'ping' }) });

const document = createDocument({
  openapi: '3.1.0',
  info: { title: 'framework-guard example', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  components: {},
  paths: {
    '/api/echo': {
      post: {
        summary: 'Echo body',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: EchoBody.openapi({ ref: 'EchoBody' }) },
          },
        },
        responses: {
          '200': {
            description: 'Echo response',
            content: {
              'application/json': {
                schema: z
                  .object({
                    success: z.literal(true),
                    data: z.object({ body: EchoBody }),
                  })
                  .openapi({ ref: 'EchoResponse' }),
              },
            },
          },
        },
      },
    },
  },
});
```

- Run this generator inside a `scripts/generate-openapi.ts` file and emit `openapi.json` into `dist/` or `public/`.  
- Add `npm run docs:openapi` as a build step or GitHub Action so the spec never drifts from the Zod definitions.  
- Reference: [zod-openapi](https://github.com/asteasolutions/zod-to-openapi) (compatible with Zod v3/v4).

## 2. Validate Requests & Responses

```ts
import express from 'express';
import { OpenApiValidator } from 'express-openapi-validator';
import spec from './openapi.json';

const app = express();
app.use(express.json());

await new OpenApiValidator({
  apiSpec: spec,
  validateRequests: true,
  validateResponses: true,
}).install(app);
```

- Place the validator **after** shared middleware (`requestId`, `logRequests`, auth) but **before** your route handlers.  
- Reuse `errorHandler()` so schema validation errors return the same JSON error envelope.  
- Reference: [express-openapi-validator docs](https://cdimascio.github.io/express-openapi-validator/).

## 3. Serve Documentation

Expose the spec (or Swagger UI) for consumers:

```ts
import swaggerUi from 'swagger-ui-express';
import spec from './openapi.json';

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
app.get('/openapi.json', (_req, res) => res.json(spec));
```

- Protect `/docs` with auth in production or host it behind a reverse proxy.  
- Link `/openapi.json` from your README, CHANGELOG, and release notes.  
- If you deploy to serverless hosts (Vercel, Fly.io, Cloudflare), commit the JSON file so it is available without rebuilding.

## 4. Automation Tips

1. Add `openapi.json` to the `files` array only when shipping compiled artifacts (or host it separately).  
2. Cache the generator’s output and fail CI if the generated spec differs from the committed version.  
3. Include version metadata (semver, git SHA) inside the spec so users can reconcile docs vs. deployed code.  
4. If you maintain multiple major versions, keep separate specs (e.g., `openapi.v1.json`, `openapi.v2.json`) and mention migration guidance in `docs/migrations/`.

By automating the document generation and enforcement loop, downstream consumers always receive accurate, machine-readable API contracts that reflect the exact Zod schemas used by `validate()`.
