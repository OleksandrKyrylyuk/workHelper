'use client'

import * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble, ChatInput } from '@/components/chat'
import type { Message } from '@/components/chat'
import { streamChat } from '@/lib/api/services/chat.service'
import type { ChatMessage } from '@/lib/api/services/chat.service'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [streaming, setStreaming] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    const userMessage: Message = { id: generateId(), role: 'user', content: text }
    const assistantId = generateId()
    const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setStreaming(true)

    // Build history from completed messages only (exclude the just-added pair)
    const history: ChatMessage[] = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      await streamChat(
        text,
        history,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          )
        },
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
          )
          setStreaming(false)
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${error}`, streaming: false }
                : m
            )
          )
          setStreaming(false)
        }
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, streaming: false }
            : m
        )
      )
      setStreaming(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Chat</h1>
        <p className="text-sm text-muted-foreground">Ask questions about your uploaded documents</p>
      </div>

      <ScrollArea className="flex-1 rounded-lg border bg-background p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-75 text-center">
            <p className="text-muted-foreground text-sm">
              No messages yet. Start by asking a question about your documents.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="mt-4 shrink-0">
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  )
}


