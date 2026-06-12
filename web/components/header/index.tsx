import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">WorkHelper</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="default">
            Sign In
          </Button>
          <Button variant="default" size="default">
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  )
}

