# Production Checklist

This checklist tracks everything required to ship `framework-guard` as a production-grade Express middleware suite. Each section highlights recommended practices, tooling, and pitfalls with links to the primary references mentioned in the planning brief.

## 1. Stable Production-Grade Setup

- **Best practices**
  - Target the latest Active LTS (Node 22.x) and build for native ESM while still offering CommonJS consumers an escape hatch through `exports`. Keep the toolchain (tsup, TypeScript) aligned with that runtime target.
  - Enable the entire TypeScript strictness surface (`strict`, `noImplicitAny`, `forceConsistentCasingInFileNames`, `declaration`, `declarationMap`) so downstream users inherit accurate typings. Emit `.d.ts` and `.d.ts.map` files alongside `.mjs/.cjs`.
  - Gate publishable assets through the `files` whitelist and build via `prepack` to ensure npm only sees compiled artifacts.
- **Tools**
  - [`tsup`](https://tsup.egoist.dev/) with `--target node22` produces optimized dual-format bundles.
  - [`npm pkg set publishConfig.access=public`](https://docs.npmjs.com/cli/v10/commands/npm-publish) for scoped packages.
- **Pitfalls**
  - Avoid mixing CommonJS `main` entries inside `"type": "module"` packages.
  - Do not rely on `console.log` for production logging—wire a structured logger (Pino/Bunyan) through middleware options.  
  - Enable npm account 2FA before publishing.  
  - Reference: [Snyk Node.js production checklist](https://snyk.io/blog/node-js-security-checklist/).

## 2. Testing (Unit & Integration)

- **Best practices**
  - Split tests under `tests/unit` and `tests/integration` (or similar) with globbed filenames `*.test.ts` / `*.spec.ts`.
  - Mock only the Express surface you control. Use `Partial<Request>` and `Partial<Response>` or helpers like `node-mocks-http`.
  - Integration tests should boot a real Express app plus Supertest to run requests through the entire middleware stack (JWT, validation, errors).
  - Add “package tests” by running `npm pack`, installing the tarball in a throwaway fixture app, and executing smoke flows.
- **Tools**
  - [`vitest`](https://vitest.dev/) for fast TS-friendly unit tests.
  - [`supertest`](https://github.com/visionmedia/supertest) for full-stack HTTP assertions.
- **Pitfalls**
  - Always exercise error code paths (e.g., missing auth headers, invalid body) so `next(err)` is covered.
  - Never call `next()` after sending a response; tests should assert the middleware stops as expected.
  - References: [dev.to integration test guide](https://dev.to/ozkanpakdil/api-integration-tests-with-jest-and-supertest-3aab), [Plain English Express testing tips](https://javascript.plainenglish.io/express-middleware-testing-strategies-456c8e).

## 3. GitHub Actions CI Workflows

- **Best practices**
  - Run lint, type-check, tests (unit/integration), build, and audit on every PR/push using the official Node action. Keep the Node version matrix aligned with the `engines` field.
  - Cache npm installs via `actions/setup-node` to reduce CI time.
  - Separate the publish flow into `release.yml`, triggered only after CI passes on `main`, and gate it behind `semantic-release`.
- **Tools**
  - `actions/setup-node@v4` for Node provisioning.
  - `semantic-release` with `GH_TOKEN`/`NPM_TOKEN` secrets.
  - Optional: Snyk/Dependabot workflows for automated security scanning.
- **Pitfalls**
  - Forgetting to align CI Node versions with supported runtime causes subtle runtime bugs.
  - Re-using caches across branches without keys can leak dependencies.
  - References: [GitHub Actions Node template](https://snyk.io/blog/github-actions-node-js/).

## 4. Semantic Versioning & Release Management

- **Best practices**
  - Adhere to SemVer (MAJOR.MINOR.PATCH) and start “stable” at `1.0.0`.
  - Enforce Conventional Commits so semantic-release can infer version bumps and changelogs.
  - Maintain `CHANGELOG.md` via semantic-release’s changelog/git plugins and add migration notes for any breaking changes.
- **Tools**
  - [`semantic-release`](https://semantic-release.gitbook.io/) with the `conventional-changelog-conventionalcommits` preset.
  - GitHub protected branch rules to ensure only reviewed commits trigger releases.
- **Pitfalls**
  - Never ship breaking changes under a minor/patch release.
  - Avoid force-pushes that remove history or annotated tags.
  - References: [npm SemVer docs](https://docs.npmjs.com/about-semantic-versioning).

## 5. TypeScript Developer Experience

- **Best practices**
  - Provide exhaustive `.d.ts` coverage with `strict` enabled and no lingering `any` in the public API.
  - Export Express-friendly types (`RequestHandler`, `MiddlewareFactory`) and use TypeScript utility types in samples/tests.
  - Supply TSDoc/JSDoc comments so editors surface parameter and configuration guidance.
- **Tools**
  - `tsconfig.vitest.json` to type-check tests/examples separately.
  - [`tsd`](https://github.com/SamVerschueren/tsd) or `vitest --types` checks for API-level validation.
- **Pitfalls**
  - Publishing raw `.ts` files without build artifacts confuses consumers.
  - Forgetting to re-export types from the package entrypoint.
  - References: [Snyk TypeScript strict mode article](https://snyk.io/blog/typescript-best-practices/).

## 6. Security Audits & Vulnerability Scanning

- **Best practices**
  - Automate `npm audit --audit-level=high` during CI and keep `package-lock.json` committed.
  - Enable Dependabot alerts and optional Snyk scanning for both npm modules and GitHub Actions.
  - Sanitize JWT handling (use `crypto.timingSafeEqual` if comparing secrets) and never log sensitive payloads.
- **Tools**
  - [`npm audit`](https://docs.npmjs.com/cli/v10/commands/npm-audit).
  - [`snyk/actions/node`](https://github.com/snyk/actions).
- **Pitfalls**
  - Ignoring “low” severity alerts that later escalate.
  - Publishing without npm 2FA increases supply-chain attack risk.
  - References: [npm audit docs](https://docs.npmjs.com/about-audit-reports).

## 7. OpenAPI Documentation & Validation

- **Best practices**
  - Keep an OpenAPI contract (YAML/JSON) in source control and validate requests/responses at runtime with `express-openapi-validator`.
  - Generate schemas from existing Zod validators using [`zod-openapi`](https://github.com/asteasolutions/zod-to-openapi) to avoid duplication.
  - Expose `/docs` or `/openapi.json` endpoints (behind auth in production) and link to them in README/CHANGELOG.
- **Tools**
  - `zod-openapi` for schema generation.
  - `swagger-ui-express` or `redoc-express` for interactive docs.
- **Pitfalls**
  - Relying on manual docs invites drift; regenerate specs in CI.
  - Skipping response validation leaves clients guessing.
  - References: [express-openapi-validator docs](https://cdimascio.github.io/express-openapi-validator/), [Speakeasy zod-openapi guide](https://www.speakeasy.com/blog/zod-openapi).

## 8. Performance & Scalability

- **Best practices**
  - Keep middleware async and avoid sync I/O (`fs.readFileSync`, blocking JWT operations).
  - Integrate a fast logger (Pino) plus `requestId` correlation, and allow log level configuration via env vars.
  - Enable compression/caching where appropriate, set `NODE_ENV=production`, and document expectations for running behind a reverse proxy.
  - Load-test critical paths (k6/Artillery) before each major release.
- **Tools**
  - `pino` or `pino-http` for non-blocking logging.
  - `compression` middleware and CDN caching headers.
- **Pitfalls**
  - Performing CPU-heavy work inline—offload to queues/background workers.
  - Allowing unlimited middleware stacks without profiling.
  - References: [Express production best practices](https://expressjs.com/en/advanced/best-practice-performance.html).

## 9. Migration Strategy & Changelog

- **Best practices**
  - Maintain `CHANGELOG.md` under the Keep a Changelog format with sections for Added/Changed/Deprecated/Removed/Fixed/Security.
  - Call out breaking changes with `BREAKING CHANGE` plus dedicated migration notes (README or `/docs/migrations/<version>.md`).
  - If supporting legacy Express versions, branch (`v1.x`) and keep critical fixes flowing while new development lands on `main`.
- **Tools**
  - `semantic-release` + changelog/git plugins automatically append entries per release.
  - GitHub Discussions or Releases for additional upgrade commentary.
- **Pitfalls**
  - Skipping changelog updates or burying breaking changes inside PR descriptions.
  - Deleting tags or rebasing published history, which confuses consumers.
  - References: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [npm versioning guide](https://docs.npmjs.com/about-semantic-versioning).
