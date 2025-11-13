# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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

