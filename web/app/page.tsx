import { auth } from '@/lib/auth'
import { SignInForm } from '@/components/auth/sign-in-form'

export default async function Home() {
  const session = await auth()

  if (!session) {
    return <SignInForm />
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <h1 className="text-4xl font-bold text-foreground">
        Welcome to Work Helper
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Your intelligent work assistant
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
        {' '}({session.user.role})
      </p>
    </div>
  )
}
