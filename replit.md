# Exam Seating Manager

Exam Seating Manager helps school staff manage rooms and class rosters, generate mixed-class exam seating plans, look up student seats, and print room charts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/exam-seating-manager` — React/Vite app and user-facing routes
- `artifacts/api-server/src/routes/exam.ts` — rooms, classes, sessions, seating generation, swaps, lookup
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/exam.ts` — Drizzle schema for school data

## Architecture decisions

- The seating generator preserves each selected class's roll order and rotates between available classes across seats, carrying the cursor into the next room.
- Room import uses a preview/confirm flow so classroom-capacity validation happens before rows are written.
- Classes, students, and rooms start empty; users populate them through the roster and room CSV upload flows.
- The built-in PostgreSQL database is the development persistence layer for this workspace.
- Firebase Web SDK is configured for email/password admin authentication; the public lookup route intentionally remains accessible without a session.

## Product

The app includes an operations dashboard, room CRUD and CSV import preview, class/student roster management, exam sessions with multi-class seating groups, generated and editable seating data, public lookup, and print-ready views.

## User preferences

No additional user preferences recorded.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`; the generated Zod barrel can contain duplicate type/schema names for operations with params, so keep the barrel exporting generated runtime schemas only.
- Firebase email/password accounts must be created and enabled in the connected Firebase project's Authentication console before admin sign-in can succeed.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
