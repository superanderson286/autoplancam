import { pgTable, text, timestamp, boolean, uniqueIndex, serial, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// --- TABLA USER ---
// CORRECCIÓN 1: Usamos 'timestamp without time zone' y SQL raw 'now()' para las marcas de tiempo,
// ya que esto coincide con la salida de tu DB.
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  // hashedPassword es nullable en la DB
  password: text('password'), 
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`), // Simplificado para coincidir con el DEFAULT NOW() de la DB
  expiresAt: timestamp('expires_at', { withTimezone: true }), // Para la expiración por tiempo
  reportsUsed: integer('reports_used').notNull().default(0), // Para la expiración por uso
  reportsLimit: integer('reports_limit').notNull().default(0), // Para el límite de uso

  // Columnas añadidas para la gestión de baneos
  banned: boolean('banned').default(false).notNull(),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
});

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

// --- TABLA SESSION ---
export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  
  // CORRECCIÓN 2: El campo 'updated_at' FALTABA en la DB para esta tabla. Se agrega.
  createdAt: timestamp('created_at').notNull().default(sql`now()`), 
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`), // Agregado para cumplir con Better Auth
  
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Columna añadida para la suplantación de sesión
  impersonatedBy: text('impersonated_by'),
});

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// --- TABLA ACCOUNT ---
export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  
  // CORRECCIÓN 3: provider_account_id es NULABLE en tu DB y necesario para el hook.
  providerAccountId: text('provider_account_id'), 
  
  password: text('password'), // Renombrado para coincidir con lo que better-auth espera
  accountId: text('account_id').notNull().unique(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  
  // Corregido para usar SQL raw 'now()'
  createdAt: timestamp('created_at').notNull().default(sql`now()`), 
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  
}, (acc) => ({
  providerProviderAccountIdIdx: uniqueIndex('provider_provider_account_id_idx').on(acc.providerId, acc.providerAccountId),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// --- TABLA VERIFICATION ---
// Esta tabla no requiere corrección, ya que coincide con la salida SQL.
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
});

// --- TABLA PRODUCTS ---
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: text('name'),
    category: text('category'),
    spec_value: text('spec_value'),
    spec_unit: text('spec_unit'),
    description: text('description'),
});