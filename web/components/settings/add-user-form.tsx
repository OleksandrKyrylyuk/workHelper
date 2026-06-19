'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { createUser, type CreateUserInput } from '@/lib/actions/users'

export function AddUserForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: '',
    role: 'user',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const result = await createUser(formData)

    if (result.success) {
      setSuccess(true)
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
      })
      // Redirect to users list after short delay
      setTimeout(() => {
        router.push('/settings/users')
      }, 1500)
    } else {
      setError(result.error || 'Failed to create user')
    }

    setIsSubmitting(false)
  }

  const handleChange = (field: keyof CreateUserInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-900">
          <p className="text-sm">User created successfully! Redirecting...</p>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="user@example.com"
          required
          disabled={isSubmitting || success}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="John Doe"
          required
          disabled={isSubmitting || success}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isSubmitting || success}
        />
        <p className="text-xs text-muted-foreground">
          Password must be at least 8 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => handleChange('role', value)}
          disabled={isSubmitting || success}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Admins have full access to all features including user management
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || success}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/settings/users')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
