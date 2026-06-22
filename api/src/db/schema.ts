import { pgTable, text, timestamp, uuid, bigint } from 'drizzle-orm/pg-core';

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

export const audioFiles = pgTable('audio_files', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    filename: text('filename').notNull(),
    s3Key: text('s3_key').notNull(),
    contentType: text('content_type').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('uploading'), // uploading | uploaded | transcribing | transcribed | analyzing | analyzed | failed
    textS3Key: text('text_s3_key'),
    analysisS3Key: text('analysis_s3_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AudioFile = typeof audioFiles.$inferSelect;
export type NewAudioFile = typeof audioFiles.$inferInsert;
