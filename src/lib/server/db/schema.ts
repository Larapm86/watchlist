import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const watchlist = pgTable('watchlist', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	posterPath: text('poster_path'),
	overview: text('overview'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	watchedAt: timestamp('watched_at')
});

export * from './auth.schema';
