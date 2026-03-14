import { User, Bot, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types"

interface ChatMessageProps {
  message: ChatMessage
  className?: string
}

export function ChatMessageBubble({ message, className }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <article
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse",
        className
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        ) : (
          <Bot className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
        )}
        <span className="sr-only">{isUser ? "You" : "Assistant"}</span>
      </div>

      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border text-card-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {message.basedOnRoutine && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            <span>Based on your routine</span>
          </div>
        )}

        {message.citation && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              isUser ? "bg-primary-foreground/10" : "bg-muted"
            )}
          >
            <span className="font-medium">Source:</span>
            <span>{message.citation}</span>
          </div>
        )}
      </div>
    </article>
  )
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your message...",
  disabled = false,
  className,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="inline-flex h-auto items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Send
      </button>
    </div>
  )
}
