# CLAUDE.md — Discord Incident Bot Reference

This document serves as a quick reference guide for command execution, development scripts, and style rules for the project.

---

## 🛠️ Build & Dev Commands

```bash
npm run dev                  # Start local development server
npm run build                # Run Next.js production compilation (Turbopack)
npm run lint                 # Run ESLint validation (clean build has 0 errors/warnings)
npm run db:push              # Sync Drizzle schema with database
npm run register-commands    # Register slash commands to the Discord server
npm run seed-admin           # Seed the initial admin credentials for the dashboard
```

---

## 🎨 Style Guidelines & Code Rules

* **TypeScript & Safety:** Use TypeScript with strict settings. Avoid generic `any` where possible, or use explicit warnings where external interaction shapes are untyped.
* **Imports:** Use paths alias `@/*` mapping directly to root. E.g., `@/lib/...` for library utilities.
* **Database Queries:** Always import lazy DB instance `db` from `@/lib/db/client`. Never initiate `neon` queries directly at build time to ensure Next.js builds do not fail due to a missing build-time env configuration.
* **API Handlers:** Keep Next.js route handlers simple, routing requests quickly. 
* **Interaction Timing (3-second rule):**
  * Modal submissions and button clicks must call `processIncident` asynchronously (non-blocking) and immediately return a deferred response (`type: 5` or `type: 6`) to remain under Discord's 3-second limit.
* **Deduplication:** Always verify interactions against `checkAndInsertInteractionId()` inside `/api/discord/interactions` to prevent concurrent race conditions.
* **Resilience:** Wrap every network and database operation in individual try/catch blocks within background workers, writing failure events to `incident_events` instead of breaking the execution thread.
