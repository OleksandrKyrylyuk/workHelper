'use server'

import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface ActiveUser {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'user'
  createdAt: Date
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: 'admin' | 'user'
}

export interface UserActionResult {
  success: boolean
  error?: string
}

/**
 * Verify that the current user is an admin
 */
async function requireAdmin(): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
}

/**
 * Get all active (non-deleted) users
 */
export async function getActiveUsers(): Promise<ActiveUser[]> {
  await requireAdmin()

  const { rows } = await pool.query<{
    id: string
    email: string
    name: string | null
    role: 'admin' | 'user'
    created_at: Date
  }>(
    `SELECT id, email, name, role, created_at 
     FROM auth_users 
     WHERE deleted_at IS NULL 
     ORDER BY created_at DESC`
  )

  return rows.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  }))
}

/**
 * Create a new user
 */
export async function createUser(
  input: CreateUserInput
): Promise<UserActionResult> {
  try {
    await requireAdmin()

    // Validate input
    if (!input.email || !input.email.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }

    if (!input.password || input.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Name is required' }
    }

    if (input.role !== 'admin' && input.role !== 'user') {
      return { success: false, error: 'Invalid role' }
    }

    // Check if email already exists (including soft-deleted users)
    const { rows: existingUsers } = await pool.query(
      'SELECT id FROM auth_users WHERE email = $1 LIMIT 1',
      [input.email.toLowerCase().trim()]
    )

    if (existingUsers.length > 0) {
      return { success: false, error: 'Email already exists' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10)

    // Insert user
    await pool.query(
      `INSERT INTO auth_users (email, password, name, role) 
       VALUES ($1, $2, $3, $4)`,
      [
        input.email.toLowerCase().trim(),
        hashedPassword,
        input.name.trim(),
        input.role,
      ]
    )

    revalidatePath('/settings/users')
    return { success: true }
  } catch (error) {
    console.error('createUser error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create user' }
  }
}

/**
 * Soft delete a user by setting deleted_at timestamp
 */
export async function softDeleteUser(userId: string): Promise<UserActionResult> {
  try {
    await requireAdmin()

    const session = await auth()

    // Prevent deleting yourself
    if (session?.user?.id === userId) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    // Update deleted_at timestamp
    const { rowCount } = await pool.query(
      `UPDATE auth_users 
       SET deleted_at = NOW() 
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    )

    if (rowCount === 0) {
      return { success: false, error: 'User not found or already deleted' }
    }

    revalidatePath('/settings/users')
    return { success: true }
  } catch (error) {
    console.error('softDeleteUser error:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete user' }
  }
}
