"use client"

import { useState, useRef, useEffect } from "react"
import { ChatMessageBubble, ChatInput } from "@/components/chat/chat-message"
import { Disclaimer } from "@/components/disclaimer"
import { useAuth } from "@/components/auth/auth-provider"
import { loadChatHistory, saveChatHistory, WELCOME_MESSAGE } from "@/lib/chat-storage"
import { sendChatMessage, getRoutine } from "@/lib/data"
import { USE_MOCK } from "@/lib/data"
import { generateId } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types"

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [routineSnapshot, setRoutineSnapshot] = useState<{ am: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>; pm: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }> } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = loadChatHistory(user?.id)
    setMessages(stored && stored.length > 0 ? stored : [WELCOME_MESSAGE])
  }, [user?.id])

  useEffect(() => {
    if (USE_MOCK) return
    getRoutine().then((r) => setRoutineSnapshot({ am: r.am ?? [], pm: r.pm ?? [] }))
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    saveChatHistory(user?.id, messages)
  }, [messages, user?.id])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const { reply } = await sendChatMessage(userMessage.content, routineSnapshot ?? undefined)
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Please try again."
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: message,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl flex flex-col flex-1 min-h-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Skincare Consultant</h1>
          <p className="text-sm text-muted-foreground">
            Ask me about ingredients, routine advice, and product recommendations.
          </p>
        </div>

        {/* Messages Area - ref on scroll container so scroll-to-bottom works */}
        <div ref={scrollRef} className="flex-1 overflow-auto pr-4 min-h-0">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="animate-bounce delay-0 h-2 w-2 rounded-full bg-primary" />
                  <span className="animate-bounce delay-150 h-2 w-2 rounded-full bg-primary" />
                  <span className="animate-bounce delay-300 h-2 w-2 rounded-full bg-primary" />
                </div>
                <span>Thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border pt-4 mt-4 space-y-3">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            placeholder="Ask about ingredients, routine tips, or product advice..."
            disabled={isLoading}
          />
          <Disclaimer className="text-xs">
            Results are for guidance only and do not replace professional dermatological advice.
          </Disclaimer>
        </div>
      </div>
    </div>
  )
}
