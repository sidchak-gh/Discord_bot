import { pgTable, serial, text, boolean, integer, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// ─── server_configs ───────────────────────────────────────────────────────────
// One row per Discord server (guild). Stores all per-server configuration.
export const serverConfigs = pgTable('server_configs', {
  guildId:          text('guild_id').primaryKey(),
  guildName:        text('guild_name').notNull(),
  incidentsChannel: text('incidents_channel'),       // channel ID where bot posts incident cards
  mirrorWebhookUrl: text('mirror_webhook_url'),      // Discord channel webhook URL for ops-mirror
  p1RoleId:         text('p1_role_id'),              // role to ping for P1 incidents
  p2RoleId:         text('p2_role_id'),              // role to ping for P2 incidents
  autoSeverity:     boolean('auto_severity').default(true), // let Gemini decide severity
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})

// ─── incidents ────────────────────────────────────────────────────────────────
// One row per incident created via /incident modal.
export const incidents = pgTable('incidents', {
  id:               serial('id').primaryKey(),
  interactionId:    text('interaction_id').unique().notNull(), // Discord interaction ID — dedup key
  guildId:          text('guild_id').notNull(),
  reportedById:     text('reported_by_id').notNull(),
  reportedByTag:    text('reported_by_tag').notNull(),
  title:            text('title').notNull(),
  description:      text('description').notNull(),
  affectedSystem:   text('affected_system'),
  severity:         text('severity').notNull().default('P3'), // P1 | P2 | P3
  aiSummary:        text('ai_summary'),
  aiReasoning:      text('ai_reasoning'),
  status:           text('status').notNull().default('open'), // open | claimed | resolved
  claimedById:      text('claimed_by_id'),
  claimedByTag:     text('claimed_by_tag'),
  discordMessageId: text('discord_message_id'),       // message ID of the incident card
  discordChannelId: text('discord_channel_id'),       // channel where card was posted
  resolvedAt:       timestamp('resolved_at'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})

// ─── interaction_log ──────────────────────────────────────────────────────────
// Dual purpose: (1) dedup store for ALL interactions, (2) observability log.
// The UNIQUE constraint on interaction_id is the atomic dedup mechanism.
export const interactionLog = pgTable('interaction_log', {
  id:              serial('id').primaryKey(),
  interactionId:   text('interaction_id').unique().notNull(),
  guildId:         text('guild_id'),
  userId:          text('user_id'),
  commandName:     text('command_name'),
  interactionType: integer('interaction_type'),
  rawPayload:      jsonb('raw_payload'),
  status:          text('status').notNull().default('pending'), // pending | success | failed
  errorMessage:    text('error_message'),
  processingMs:    integer('processing_ms'),
  createdAt:       timestamp('created_at').defaultNow(),
})

// ─── incident_events ──────────────────────────────────────────────────────────
// Append-only audit trail for every action on an incident.
// Also serves as the observability record for downstream failures.
export const incidentEvents = pgTable('incident_events', {
  id:          serial('id').primaryKey(),
  incidentId:  integer('incident_id').notNull(),
  eventType:   text('event_type').notNull(), // created | claimed | escalated | resolved | mirror_failed | ai_failed | discord_post_failed
  actorId:     text('actor_id'),
  actorTag:    text('actor_tag'),
  metadata:    jsonb('metadata'),
  createdAt:   timestamp('created_at').defaultNow(),
})

// ─── admin_users ──────────────────────────────────────────────────────────────
// Dashboard admin accounts. Password hashed with bcrypt.
export const adminUsers = pgTable('admin_users', {
  id:           serial('id').primaryKey(),
  email:        text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
})
