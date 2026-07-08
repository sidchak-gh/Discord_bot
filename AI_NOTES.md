# AI_NOTES.md

## 🤖 AI Tools & Collaboration Model

For this coding challenge, I paired with **Antigravity (powered by Gemini models)**. 

### Work Split
* **Human (Me):** Defined the project architecture (single full-stack Next.js repository deployable to Vercel), decided the database layout, set the resilience strategy (isolated try/catch loops for downstream workers), selected Option B (Discord webhook) to reduce stack complexity, and audited the linting/compiler outputs.
* **AI (Gemini):** Scaffolding Next.js templates, writing boilerplate signature verification wrappers, writing ORM table schemas, crafting the CSS layouts, and setting up the API endpoint routers.

---

## 💡 Key Technical Decisions

I made three critical decisions to maintain the quality bar:

1. **Deduplication via PostgreSQL Unique Constraint:** 
   Rather than introducing a Redis service (which would add stack complexity and potential pricing tiers) or using in-memory caches (which fail instantly on serverless platforms due to multi-instance scaling and cold starts), I added a `unique` constraint on the `interaction_id` field in the database log. Database-level constraints guarantee atomicity under concurrent requests, preventing double processing even if Discord duplicates a request.
2. **Lazy-Loaded Database Wrapper (Proxy Pattern):**
   During static generation, Next.js inspects API routes and pages. When compiling in build pipelines where `DATABASE_URL` is omitted, Neon's Postgres driver throws initialization errors. I implemented a lazy-loading Proxy pattern in `lib/db/client.ts`. The client only initiates when a query is first executed at runtime. This allows standard Next.js static builds to compile cleanly in CI/CD without database credentials.
3. **Discord Webhook Mirroring (Option B):**
   Using Slack would require setting up a Slack App and handling Slack's Block Kit formatting. By selecting Discord-to-Discord mirroring, we could reuse the exact same embed cards generated for the main channel. Posting to the mirror channel is simplified to a single `fetch()` call to a Discord channel webhook URL.

---

## 🐛 Hardest Bug & Resolution

During compilation, Next.js failed with the following TypeScript error:
```bash
./lib/discord/verify.ts:18:5
Type error: Type 'Promise<boolean>' is not assignable to type 'boolean'.
```

### What Happened
The AI assumed that `verifyKey` from the `discord-interactions` library was a synchronous verification check. However, in newer versions of the library, `verifyKey` is asynchronous and returns a `Promise<boolean>` due to its underlying cryptography primitives.

### How I Fixed It
I caught this compilation error during a trial build. To resolve it:
1. I refactored `verifyDiscordSignature` in `lib/discord/verify.ts` to be an `async` function returning `Promise<boolean>`, awaiting the `verifyKey` call.
2. I updated the router endpoint `app/api/discord/interactions/route.ts` to properly `await` the signature check before routing:
   ```typescript
   const isValid = await verifyDiscordSignature(
     process.env.DISCORD_PUBLIC_KEY!,
     rawBody,
     signature,
     timestamp
   )
   ```
This resolved the type error and ensured the compiler passed cleanly.

---

## 📈 Future Improvements (With More Time)

If I had more time to refine this project:
* **Server-Sent Events (SSE):** Replace the 30-second client-side refresh in the dashboard with Server-Sent Events to push real-time incident status and logs.
* **Discord OAuth Login:** Replace the throwaway Credentials-based login with Discord OAuth2 login, checking if the administrator has specific role IDs inside the Discord Guild before allowing dashboard configuration access.
