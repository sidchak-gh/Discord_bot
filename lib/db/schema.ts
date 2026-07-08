import { pgTable, serial, text, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'

// Stores all per-server configuration
export const serverConfigs = pgTable('server_configs', {
  guildId:          text('guild_id').primaryKey(),
  guildName:        text('guild_name').notNull(),
  incidentsChannel: text('incidents_channel'),
  mirrorWebhookUrl: text('mirror_webhook_url'),
  p1RoleId:         text('p1_role_id'),
  p2RoleId:         text('p2_role_id'),
  autoSeverity:     boolean('auto_severity').default(true),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})

// Stores incidents created via slash command modal
export const incidents = pgTable('incidents', {
  id:               serial('id').primaryKey(),
  interactionId:    text('interaction_id').unique().notNull(), // uniqueness constraint for deduplication
  guildId:          text('guild_id').notNull(),
  reportedById:     text('reported_by_id').notNull(),
  reportedByTag:    text('reported_by_tag').notNull(),
  title:            text('title').notNull(),
  description:      text('description').notNull(),
  affectedSystem:   text('affected_system'),
  severity:         text('severity').notNull().default('P3'),
  aiSummary:        text('ai_summary'),
  aiReasoning:      text('ai_reasoning'),
  status:           text('status').notNull().default('open'),
  claimedById:      text('claimed_by_id'),
  claimedByTag:     text('claimed_by_tag'),
  discordMessageId: text('discord_message_id'),
  discordChannelId: text('discord_channel_id'),
  resolvedAt:       timestamp('resolved_at'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})

// Observability and deduplication log
export const interactionLog = pgTable('interaction_log', {
  id:              serial('id').primaryKey(),
  interactionId:   text('interaction_id').unique().notNull(),
  guildId:         text('guild_id'),
  userId:          text('user_id'),
  commandName:     text('command_name'),
  interactionType: integer('interaction_type'),
  rawPayload:      jsonb('raw_payload'),
  status:          text('status').notNull().default('pending'),
  errorMessage:    text('error_message'),
  processingMs:    integer('processing_ms'),
  createdAt:       timestamp('created_at').defaultNow(),
})

// Append-only audit trail and observability record for downstream failures
export const incidentEvents = pgTable('incident_events', {
  id:          serial('id').primaryKey(),
  incidentId:  integer('incident_id').notNull(),
  eventType:   text('event_type').notNull(),
  actorId:     text('actor_id'),
  actorTag:    text('actor_tag'),
  metadata:    jsonb('metadata'),
  createdAt:   timestamp('created_at').defaultNow(),
})

// Dashboard admin accounts with bcrypt hashes
export const adminUsers = pgTable('admin_users', {
  id:           serial('id').primaryKey(),
  email:        text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
})
