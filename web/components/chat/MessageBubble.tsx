import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'
import type { ChatSource } from '@/lib/api/services/chat.service'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  sources?: ChatSource[]
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const images = message.sources?.filter((s) => s.imageUrl) ?? []

  return (
    <div className={cn('flex gap-3 w-full', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('max-w-[75%] flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
          {message.streaming && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-current align-text-bottom animate-pulse" />
          )}
        </div>

        {!message.streaming && images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((source, i) => (
              <a
                key={i}
                href={source.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.imageUrl}
                  alt={source.pageNumber ? `Page ${source.pageNumber}` : `Image ${i + 1}`}
                  className="max-w-60 max-h-45 object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
