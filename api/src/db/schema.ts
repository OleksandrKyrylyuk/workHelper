import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().default('admin'),
    filename: text('filename').notNull(),
    s3Key: text('s3_key').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').notNull().default('uploaded'), // uploaded | processing | indexed | failed
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
