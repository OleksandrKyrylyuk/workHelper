"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/sidebar/sidebar-context"

export function SidebarToggle() {
  const { toggle } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={toggle}
      aria-label="Toggle sidebar"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
