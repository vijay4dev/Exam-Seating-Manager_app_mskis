---
name: API codegen and import safety
description: Non-obvious workspace constraints discovered while building the exam seating app.
---

The generated Zod barrel can fail TypeScript when it re-exports both runtime schemas and generated type files for operations with path/query params; exporting the generated runtime schema module is sufficient for the server's validation use.

**Why:** Orval emits a runtime `*Params` schema and a type-level `*Params` declaration with the same export name.

The exam workspace intentionally starts with no predefined classes, students, or rooms; imports are the source of truth for those records.

**Why:** Schools provide their own roll-number and room-capacity files, so generated sample data can be mistaken for real exam data.

Firebase email/password authentication is a client-side admin gate while the API remains backed by the workspace database.

**Why:** The provided Firebase web config is sufficient for browser auth, but server-side Firebase Admin verification requires a service-account credential that was not provided.

Disable Express ETags for these JSON API routes.

**Why:** The generated fetch client treats a bodyless 304 response as an API error, which makes the dashboard show its offline state even when the server is healthy.