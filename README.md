# 🚨 Discord Incident Response Bot

A production-grade, full-stack Incident Response system for Discord built with Next.js, Neon (Postgres), Drizzle ORM, NextAuth, and Gemini AI. 

When an incident occurs, team members can report it directly from Discord using a slash command. The system automatically triages the issue using Gemini AI, logs the details, updates Discord with interactive control cards, mirrors alerts to an operations channel, and updates a live dashboard.

---

## 🚀 Key Features

* **Instant Modal Forms:** `/incident` opens a native Discord modal form instantly (under 100ms response time).
* **AI Severity Triage:** Uses Google Gemini 1.5 Flash to summarize the incident and automatically triage severity (P1/P2/P3) based on system impact.
* **Interactive Control Cards:** Formatted Discord embed cards featuring interactive claim, escalate, and resolve buttons.
* **Discord-to-Discord Webhook Mirroring:** Option B implementation. Reuses the incident card structure to mirror read-only updates to a secondary operations or logging channel.
* **Robust Resilience:** Each step of the background job (DB writing, AI triage, card posting, mirroring, and follow-ups) is wrapped in separate try/catch blocks. Failures are captured, structured events logged, and the primary flow is never broken.
* **Atomic Deduplication:** Checks and skips duplicate interaction requests using database-level unique constraint locks.
* **NextAuth Dashboard:** A protected live dashboard with:
  * **Incidents Log:** Visual monitoring table of total, open, claimed, and resolved incidents.
  * **Observability Logs:** Complete history of every Discord interaction, detailing execution time, status, and raw errors.
  * **Configuration Panel:** Guild-specific settings to configure target channels, roles to notify on P1/P2 incidents, and toggle auto-severity.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 14/15 App Router
* **Database:** Neon Serverless Postgres
* **ORM:** Drizzle ORM (type-safe queries + schema migration)
* **Authentication:** NextAuth.js v5 (JWT & Credentials provider)
* **AI Engine:** Google Gemini 1.5 Flash (via Gemini AI Studio)
* **Deployment:** Vercel

---

## ⚙️ Environment Variables

Create a `.env` file at the root of the project using the following template (see also [.env.example](.env.example)):

```bash
# Discord App Credentials (from Discord Developer Portal)
DISCORD_APPLICATION_ID=your_discord_application_id
DISCORD_PUBLIC_KEY=your_discord_public_key_for_signature_verification
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_test_guild_id_for_instant_command_registration

# Database Connection (Neon Postgres connection string)
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require

# NextAuth Configuration
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000

# Google Gemini API Key (from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# Admin User Seed Account (runs during build/seeding to set up initial login)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_dashboard_password
```

---

## 🏁 Local Development Setup

### 1. Prerequisites
* Node.js v18 or later
* A free [Neon](https://neon.tech) Database
* A free [Google AI Studio](https://aistudio.google.com) key
* A Discord Developer Portal application with a bot user added to your test server.

### 2. Install Dependencies
```bash
npm install
```

### 3. Push Database Schema
Ensure `DATABASE_URL` is set in your `.env` file, then run:
```bash
npm run db:push
```

### 4. Seed the Admin User
To seed the initial dashboard credentials specified in `ADMIN_EMAIL` and `ADMIN_PASSWORD`:
```bash
npm run seed-admin
```

### 5. Register Slash Commands
Registers `/incident`, `/status`, and `/resolve` in your test server instantly:
```bash
npm run register-commands
```

### 6. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the login screen and admin dashboard.

---

## 🌐 Deploy to Vercel

1. Create a new repository on GitHub and push the codebase.
2. Link the repository to a new project in Vercel.
3. Configure all environment variables listed above in the Vercel Project Settings.
4. Deploy the application.
5. Seed the production database using the same `seed-admin` script locally targeting the production database, or using a one-time script.
6. Register the interactions URL in the Discord Developer Portal:
   * **Interactions Endpoint URL:** `https://your-app-url.vercel.app/api/discord/interactions`
   * Discord will ping this URL to verify the Ed25519 signature before saving.

---

## 🔬 How to Test / Evaluation Guide

### 1. Config & Channel Setup
1. Go to the deployed URL, log in with the default admin credentials:
   * **Email:** `admin@example.com`
   * **Password:** `AdminPassword123!`
2. Navigate to the **Config** page.
3. Click the **🔌 Connect Bot** button at the top of the card. This will open the Discord OAuth2 window to add the bot to your server with all required scopes (`bot` and `applications.commands`).
4. Select or configure your server by entering the Guild ID and Name in the form.
5. Input your **Incidents Channel ID** (where bot posts cards) and **Mirror Channel Webhook URL** (e.g. your #ops-mirror channel webhook).
6. Click **Save Configuration**. Click **Send test message** to verify the webhook connection.

### 2. Discord Incident Loop
1. Run `/incident` in a text channel.
2. Submit the title, description, and system.
3. Watch the ephemeral success message appear instantly, followed shortly by the color-coded embed card in the **Incidents Channel**.
4. Check your **Mirror Channel** to confirm the webhook duplicated the embed card (without buttons).
5. In the main Incidents channel, click **Claim**. The embed card updates to show who claimed it, and a notification update is sent to the mirror channel.
6. Click **Resolve** to close the incident. The card will update, buttons will be removed, and status changes on the dashboard.
7. Run `/status` in Discord to view any remaining open incidents.
