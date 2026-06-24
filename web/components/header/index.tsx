import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme"
import { auth } from "@/lib/auth"
import { signOutAction } from "@/lib/actions/auth"
import { SidebarToggle } from "./sidebar-toggle"

export async function Header() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <h1 className="text-xl font-semibold text-foreground">WorkHelper</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {session.user.email}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="default">
                  Sign Out
                </Button>
              </form>
            </>
          ) : (
            <Button variant="default" size="default" asChild>
              <a href="/">Sign In</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

