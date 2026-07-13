"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { Home, Upload, MessageSquare, Settings, Music } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./sidebar-context"

type UserRole = 'admin' | 'user' | 'guest'

const navItems = [
  { title: "Home", href: "/", icon: Home, roles: ['admin', 'user', 'guest'] as UserRole[] },
  { title: "Chat", href: "/chat", icon: MessageSquare, roles: ['admin', 'user'] as UserRole[] },
  { title: "Audio", href: "/audio/list", icon: Music, roles: ['admin'] as UserRole[] },
  { title: "Settings", href: "/settings", icon: Settings, roles: ['admin'] as UserRole[] },
  { title: "Upload", href: "/upload", icon: Upload, roles: ['admin'] as UserRole[] },
]

export function Sidebar({ role }: { role?: 'admin' | 'user' }) {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    close()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveRole: UserRole = role || 'guest'
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(effectiveRole)
  )

  return (
    <>
      {/* Backdrop overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background transition-transform duration-300",
          // Mobile: hidden by default, visible when open
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "md:translate-x-0"
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
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
    </>
  )
}

