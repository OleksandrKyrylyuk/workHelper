'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SettingsNavProps {
  items: Array<{ href: string; label: string }>
}

export function SettingsNav({ items }: SettingsNavProps) {
  const pathname = usePathname()

  return (
    <div className="border-b border-border">
      <nav className="flex gap-4" aria-label="Settings navigation">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center px-1 pt-1 pb-3 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
