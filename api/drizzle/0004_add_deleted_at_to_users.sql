-- Migration: Add deleted_at column to auth_users table
-- Purpose: Enable soft delete functionality for users

ALTER TABLE auth_users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance when filtering deleted users
CREATE INDEX idx_auth_users_deleted_at ON auth_users(deleted_at) WHERE deleted_at IS NULL;
