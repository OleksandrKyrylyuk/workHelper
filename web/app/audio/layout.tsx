"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { title: "List", href: "/audio/list" },
  { title: "Upload", href: "/audio/upload" },
]

export default function AudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audio</h1>
        <p className="text-muted-foreground">
          Manage your audio files
        </p>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-4">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {tab.title}
              </Link>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
