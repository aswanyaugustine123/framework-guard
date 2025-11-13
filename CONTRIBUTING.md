# Contributing to framework-guard

Thanks for your interest in contributing! This guide helps you set up and make effective contributions.

## Development Setup

- Node.js >= 18
- Install dependencies: `npm install`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Example server: `npm run example`
- Tests: `npm run test`

## Commit Style

Use conventional commits when possible (e.g., `feat:`, `fix:`, `docs:`, `chore:`). This helps maintainers generate changelogs and releases.

## Pull Requests

- Create a feature branch from `main`.
- Ensure `npm run typecheck && npm run test && npm run build` passes.
- Update docs (README/examples) if API or behavior changes.
- Describe the change, rationale, and any breaking changes.

## Code Style

- Prefer small, focused changes.
- Keep dependencies minimal.
- Match existing naming and structure.

## Security

Do not include secrets in issues or PRs. If you believe you’ve found a vulnerability, please open a private security disclosure (e.g., via GitHub Security Advisories) instead of a public issue.

