import { redirect } from 'next/navigation'

export default function SettingsPage() {
  // Redirect to users page as the default
  redirect('/settings/users')
}
