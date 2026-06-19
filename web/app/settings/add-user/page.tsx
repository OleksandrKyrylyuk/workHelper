import { AddUserForm } from '@/components/settings/add-user-form'

export default function AddUserPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Add New User</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new user account with email and password
        </p>
      </div>

      <AddUserForm />
    </div>
  )
}
