"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Upload, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

type UserRole = 'admin' | 'user' | 'guest'

const navItems = [
  { title: "Home", href: "/", icon: Home, roles: ['admin', 'user', 'guest'] as UserRole[] },
  { title: "Chat", href: "/chat", icon: MessageSquare, roles: ['admin', 'user', 'guest'] as UserRole[] },
  { title: "Upload", href: "/upload", icon: Upload, roles: ['admin'] as UserRole[] },
]

export function Sidebar({ role }: { role?: 'admin' | 'user' }) {
  const pathname = usePathname()

  const effectiveRole: UserRole = role || 'guest'
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(effectiveRole)
  )

  return (
    <aside className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background">
      <nav className="flex flex-col gap-1 p-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-muted hover:text-foreground",
                isActive ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

