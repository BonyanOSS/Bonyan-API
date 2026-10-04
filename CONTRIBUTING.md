# Contributing to Bonyan-API

Thank you for helping build reliable open-source Islamic software.

## Development

```bash
pnpm install
pnpm dev
```

Before opening a pull request, run:

```bash
pnpm lint:check
pnpm build
pnpm test
```

Use `pnpm lint` only when you intentionally want ESLint and Prettier to apply fixes.

## Pull Requests

- Keep changes focused.
- Add or update tests for behavior changes.
- Update `README.md` and `openapi.yaml` when public endpoints or response shapes change.
- Do not introduce a new upstream source without documenting its license, stability, timeout, and canonical mapping.
- Avoid breaking response shapes unless the change is clearly versioned.

## Adding an Upstream Source

Every upstream source should:

- Use `fetchJson` for JSON so deadlines include body parsing; `fetchWithTimeout` for HEAD probes.
- Map to the canonical types in `src/types/Items.ts`.
- Preserve the same public response shape as other sources.
- Set `apiName` to the actual source used.
- Have a focused test for fallback behavior.
- Match approved content in `SOURCES.md`; never assume two providers' IDs mean the same thing.
- Reject partial catalogues, duplicate references and placeholder text. Omit unavailable optional metadata.
- Register adapters in `scripts/check-upstreams.ts`; run live checks separately from network-free tests.
- Validate changed response shapes against `openapi.yaml`.

## Commit Style

Prefer conventional commits:

```text
feat(prayer): add new fallback source
fix(qibla): report local fallback source correctly
docs(openapi): document metrics endpoint
```
