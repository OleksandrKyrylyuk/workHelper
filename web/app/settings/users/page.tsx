import { getActiveUsers } from '@/lib/actions/users'
import { UserListTable } from '@/components/settings/user-list-table'

export default async function UsersPage() {
  const users = await getActiveUsers()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all active users in the system
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? 'user' : 'users'} total
        </div>
      </div>

      <UserListTable users={users} />
    </div>
  )
}
