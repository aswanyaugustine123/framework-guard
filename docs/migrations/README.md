# Migration Notes

Document breaking changes for every major release so consumers can upgrade safely. Use the following template (adapted from Keep a Changelog) when preparing upgrades:

```md
## Migrating from vX to vY (YYYY-MM-DD)

### Breaking changes
- Describe the API or behavioral change.
- Explain why it was necessary.
- Show the required code changes.

### Deprecations
- List features scheduled for removal in the next major version.

### Step-by-step upgrade
1. Update dependencies / Node runtime requirements.
2. Apply the code changes (include diff snippets where possible).
3. Run `npm run verify` and your integration tests.
```

## Active migrations

- `1.0.0` – Introduces the production-ready toolchain (ESLint, Vitest unit & integration suites, semantic-release automation) and raises the minimum Node requirement to >= 20. Middleware APIs remain backward compatible, but you must upgrade Node and rerun `npm run verify` before publishing.

Add dedicated files such as `docs/migrations/v2.md` when you start planning the next major release so early adopters can migrate incrementally.
