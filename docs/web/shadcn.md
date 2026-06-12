# shadcn/ui Instructions

Apply these rules whenever adding or using UI components in `web/`.

## Project Configuration

This project uses **shadcn/ui** with the following settings (see `web/components.json`):

| Setting | Value |
|---|---|
| Style | `radix-nova` |
| Base color | `neutral` |
| CSS variables | enabled |
| RSC support | enabled |
| Icon library | `lucide-react` |
| Component output | `web/components/ui/` |

## Installing Components

Always use the shadcn CLI to add new components — never copy-paste from the docs or install raw packages:

```bash
# Run from the web/ directory
npx shadcn@latest add <component-name>

# Examples
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add data-table
```

The CLI places the component file in `web/components/ui/` and installs any required dependencies automatically.

## Using Components

- **Always check `web/components/ui/` first** before writing a custom primitive.
- Import from the alias path:

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
```

- Do **not** edit files inside `web/components/ui/` directly unless explicitly asked — they are managed by the CLI and may be overwritten on updates.

## Icons

Use **`lucide-react`** exclusively — it is already configured and installed:

```tsx
import { Upload, Trash2, FileText } from "lucide-react"

<Button>
  <Upload />
  Upload File
</Button>
```

Do not install other icon libraries (`react-icons`, `heroicons`, etc.).

## Composing Feature Components

Wrap shadcn primitives into feature-specific components in `web/components/` (outside `ui/`):

```
web/components/
  ui/                  ← CLI-managed primitives (don't edit)
  file-upload-card.tsx ← Feature component (your code)
  file-list.tsx        ← Feature component (your code)
```

Example composed component:

```tsx
// web/components/file-upload-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadCardProps {
  onUpload: (files: FileList) => void
  className?: string
}

export function FileUploadCard({ onUpload, className }: FileUploadCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => {/* trigger input */}}>
          <Upload />
          Choose Files
        </Button>
      </CardContent>
    </Card>
  )
}
```

## Forms

For forms, use the `shadcn/ui` Form primitives built on `react-hook-form` + `zod`:

```bash
npx shadcn@latest add form
```

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
```

Never manage form state manually with `useState` when shadcn form primitives are available.

## Variants and Customization

Components like `Button` expose variants via `cva`. Use the built-in `variant` and `size` props:

```tsx
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="icon"><Trash2 /></Button>
```

To add new variants, edit the component file in `web/components/ui/` and document the change.

## Available Component Reference

Common shadcn components — install as needed:

| Component | Install command |
|---|---|
| Button | pre-installed |
| Input | `npx shadcn@latest add input` |
| Card | `npx shadcn@latest add card` |
| Dialog | `npx shadcn@latest add dialog` |
| Form | `npx shadcn@latest add form` |
| Table | `npx shadcn@latest add table` |
| Toast / Sonner | `npx shadcn@latest add sonner` |
| Badge | `npx shadcn@latest add badge` |
| Dropdown Menu | `npx shadcn@latest add dropdown-menu` |
| Tooltip | `npx shadcn@latest add tooltip` |
| Separator | `npx shadcn@latest add separator` |
| Skeleton | `npx shadcn@latest add skeleton` |
| Alert | `npx shadcn@latest add alert` |
| Progress | `npx shadcn@latest add progress` |

Full list: https://ui.shadcn.com/docs/components

