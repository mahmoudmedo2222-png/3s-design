# Agent Instructions

This repository is the real 3S Design application.

## Project Shape

- Monorepo managed with `pnpm` and Turbo.
- Web app: Next.js in `apps/web`.
- API: NestJS/Fastify in `apps/api`.
- Database package: Drizzle/PostgreSQL in `packages/db`.
- Shared quality command: `pnpm quality`.

## Communication

- Speak with the owner in Arabic.
- Keep repository files, code comments, commit messages, and technical artifacts in English unless a file is already Arabic.
- Explain risky changes plainly; the owner is non-technical and relies on the agent for engineering judgment.

## Working Rules

- Check `git status --short` before editing.
- Read the files you plan to change.
- Preserve user changes you did not make.
- Prefer existing project patterns over new abstractions.
- Keep changes small and scoped to the requested behavior.
- Do not add dependencies, frameworks, MCPs, skills, agents, or CI unless there is a concrete project need.
- Keep local secrets, logs, generated output, build output, and assistant working files out of Git.

## High-Risk Areas

Treat these flows carefully and add or run focused tests when they change:

- Authentication and sessions
- Cart and checkout
- Payments and webhooks
- Entitlements and downloads
- Admin product/catalog/asset management
- Database schema and migrations

## Verification

Use the narrowest useful check first:

```bash
pnpm --filter @3s-design/web lint
pnpm --filter @3s-design/web typecheck
pnpm --filter @3s-design/web test
pnpm --filter @3s-design/api lint
pnpm --filter @3s-design/api typecheck
pnpm --filter @3s-design/api test
```

Before pushing or opening a pull request, run:

```bash
pnpm install --frozen-lockfile
pnpm quality
```

If `pnpm` is not available as a shell command on this Windows machine, use:

```bash
corepack pnpm quality:local
```

If a check cannot be run, report why.

## Local Runtime Notes

- Local web: `http://localhost:3000`.
- Local API: `http://localhost:4000/api`.
- Local PostgreSQL: `127.0.0.1:55432`.
- Development database scripts live in `scripts/`.
