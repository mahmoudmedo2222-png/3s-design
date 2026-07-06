---
title: Quality Gate
status: active
updated: 2026-07-04
---

# Quality Gate

This project uses a small, repeatable quality gate before sharing code or opening a pull request.

## Local Commands

Run the full gate:

```bash
pnpm quality
```

The full gate runs:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Format code when needed:

```bash
pnpm format
```

Run the longer auth integration regression only when the local API and database are running:

```bash
pnpm test:auth
```

## What Each Check Protects

| Check          | Protects                                                           |
| -------------- | ------------------------------------------------------------------ |
| `format:check` | Consistent code shape for team readability                         |
| `lint`         | Common bugs, unused code, React hook mistakes, and unsafe patterns |
| `typecheck`    | TypeScript contracts across web, API, and database packages        |
| `test`         | Fast unit-level rules that do not need a running database          |
| `test:auth`    | Full auth regression path against the real API and database        |

## Team Rule

Before a feature branch is shared, it should pass:

```bash
pnpm quality
```

Before touching authentication, checkout, account sessions, downloads, or admin authorization, also run:

```bash
pnpm test:auth
```
