"use client"

import { useState, useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessageBubble, ChatInput } from "@/components/chat/chat-message"
import { Disclaimer } from "@/components/disclaimer"
import { mockChatMessages } from "@/lib/mock-data"
import type { ChatMessage } from "@/lib/types"

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// Mock responses for demo
const mockResponses: Record<string, string> = {
  retinol:
    "Retinol is a powerful ingredient for anti-aging and acne. Based on your routine, you're already using retinol in the PM. Remember not to combine it with AHAs or BHAs in the same routine to avoid irritation.",
  niacinamide:
    "Niacinamide is great for your concerns! It helps with acne, pigmentation, and barrier support. It's already in your routine and pairs well with most ingredients. You can safely use it in both AM and PM.",
  sunscreen:
    "Sunscreen is essential, especially since you're using actives like retinol and AHA. Based on your routine, you have SPF 50 in the morning. Make sure to reapply every 2 hours when outdoors.",
  default:
    "I can help you understand your routine, check ingredients, and answer skincare questions. Try asking about specific ingredients like retinol, niacinamide, or vitamin C!",
}

function getMockResponse(message: string): { content: string; basedOnRoutine: boolean } {
  const lower = message.toLowerCase()
  if (lower.includes("retinol")) {
    return { content: mockResponses.retinol, basedOnRoutine: true }
  }
  if (lower.includes("niacinamide")) {
    return { content: mockResponses.niacinamide, basedOnRoutine: true }
  }
  if (lower.includes("sunscreen") || lower.includes("spf")) {
    return { content: mockResponses.sunscreen, basedOnRoutine: true }
  }
  return { content: mockResponses.default, basedOnRoutine: false }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
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

    // Simulate AI response delay
    setTimeout(() => {
      const response = getMockResponse(userMessage.content)
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response.content,
        basedOnRoutine: response.basedOnRoutine,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
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

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
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
        </ScrollArea>

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
