# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.0] - 2025-11-13
### Added
- ESLint + strict TypeScript tooling plus `npm run verify` gate for lint/type-check/tests.
- Vitest unit + integration suites (Supertest), tsconfig/vitest config, and structured test helpers.
- Documentation set: `docs/production-checklist.md`, `docs/openapi.md`, and migration notes under `docs/migrations/`.
- GitHub Actions release workflow powered by `semantic-release`, npm audit script, and `.nvmrc` for Node 22 parity.
- README overhaul covering env vars, serverless usage, security/perf guidance, and updated Express example with Pino logging.

### Changed
- Node runtime requirement raised to >=20 with tsup targeting Node 22; build/dev scripts now clean + emit dual ESM/CJS with declarations/maps.
- CI workflow now covers lint, type-check, unit/integration tests, build, and security auditing across Node 20.x/22.x.
- Example app now enforces env-driven configuration, structured logs, and stricter JWT secret handling.

## [0.2.0] - 2025-11-13
### Added
- `requestId()` middleware that sets `X-Request-Id` and `req.id`.
- `logRequests()` middleware to log method/url/status/duration.
- `withHelmet()` wrapper for secure HTTP headers.
- `validate()` middleware with Zod schemas; returns 400 with `ERR_VALIDATION`.
- Central `ErrorCodes` and usage in `jwtAuth()` and `notFound()`.
- Example updates demonstrating new middlewares and `/api/echo`.
- Minimal tests for validate/requestId/logRequests.
- `prepublishOnly` script to typecheck and build before publish.

### Changed
- Bumped version to `0.2.0`.
- Added `helmet` and `zod` dependencies; added `tsx` dev dependency.

## [0.1.0] - 2025-11-13
### Added
- Initial release with Express-focused toolkit: `jwtAuth`, `errorHandler`, `notFound`, `withCors`, JWT helpers, response helpers, and `AppError`.
