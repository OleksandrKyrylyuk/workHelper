import * as React from "react"

interface PageHeaderProps {
  title: string
  description: string
  className?: string
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  )
}

