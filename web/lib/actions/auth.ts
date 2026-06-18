'use server'

import bcrypt from 'bcryptjs'
import { createSession, deleteSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { pool } from "@/lib/db";

export async function signInAction(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = (formData.get('email') as string | null)?.trim()
  const password = formData.get('password') as string | null

  if (!email || !password) return { error: 'Email and password are required' }

  try {
    const { rows } = await pool.query<{
      id: string
      email: string
      name: string | null
      password: string
      role: 'admin' | 'user'
    }>(
      'SELECT id, email, name, password, role FROM auth_users WHERE email = $1 LIMIT 1',
      [email]
    )
      console.log('User query result:', rows)
    const user = rows[0]
    if (!user) return { error: 'Invalid email or password' }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return { error: 'Invalid email or password' }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (e) {
    console.error('signInAction error:', e)
    return { error: 'Something went wrong. Please try again.' }
  }

  redirect('/chat')
}

export async function signOutAction(): Promise<void> {
  await deleteSession()
  redirect('/')
}

