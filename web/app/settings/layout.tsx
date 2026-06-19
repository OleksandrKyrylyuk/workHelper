import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SettingsNav } from '@/components/settings/settings-nav'

interface SettingsLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/settings/users', label: 'Users' },
  { href: '/settings/add-user', label: 'Add User' },
]

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const session = await auth()

  // Redirect non-admin users
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your application settings and users
        </p>
      </div>

      {/* Sub-navigation tabs */}
      <SettingsNav items={navItems} />

      {/* Content area */}
      <div>{children}</div>
    </div>
  )
}

