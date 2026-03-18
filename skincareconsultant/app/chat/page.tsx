"use client"

import { useState, useRef, useEffect } from "react"
import { ChatMessageBubble, ChatInput } from "@/components/chat/chat-message"
import { Disclaimer } from "@/components/disclaimer"
import { useAuth } from "@/components/auth/auth-provider"
import { loadChatHistory, saveChatHistory, WELCOME_MESSAGE } from "@/lib/chat-storage"
import { sendChatMessage, getRoutineCalendarBootstrap } from "@/lib/data"
import { USE_MOCK } from "@/lib/data"
import { generateId } from "@/lib/utils"
import { mockRoutine } from "@/lib/mock-data"
import type { ChatMessage } from "@/lib/types"
import type { SavedRoutineSummary } from "@/lib/types"

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineSummary[]>(
    USE_MOCK
      ? [
          {
            id: "mock",
            name: "My routine",
            am: mockRoutine.am,
            pm: mockRoutine.pm,
            is_current: true,
          },
        ]
      : [],
  )
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(USE_MOCK ? "mock" : null)
  const [loadingRoutines, setLoadingRoutines] = useState(false)
  const [routineSnapshot, setRoutineSnapshot] = useState<{
    am: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>
    pm: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>
  } | null>(
    USE_MOCK ? { am: mockRoutine.am, pm: mockRoutine.pm } : null,
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = loadChatHistory(user?.id)
    setMessages(stored && stored.length > 0 ? stored : [WELCOME_MESSAGE])
  }, [user?.id])

  useEffect(() => {
    if (USE_MOCK) return
    if (!user) return

    let cancelled = false
    setLoadingRoutines(true)

    getRoutineCalendarBootstrap()
      .then(({ defaultRoutineId, savedRoutines: list, overrides }) => {
        if (cancelled) return

        setSavedRoutines(list)

        const todayKey = new Date().toISOString().slice(0, 10)
        const scheduledRoutineId = overrides?.[todayKey] ?? defaultRoutineId ?? list[0]?.id ?? null
        const selected = list.find((r) => r.id === scheduledRoutineId) ?? list[0] ?? null

        if (selected) {
          setSelectedRoutineId(selected.id)
          setRoutineSnapshot({
            am: Array.isArray(selected.am) ? selected.am : [],
            pm: Array.isArray(selected.pm) ? selected.pm : [],
          })
        } else {
          setSelectedRoutineId(null)
          setRoutineSnapshot(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setSavedRoutines([])
        setSelectedRoutineId(null)
        setRoutineSnapshot(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingRoutines(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    saveChatHistory(user?.id, messages)
  }, [messages, user?.id])

  const handleSend = async () => {
    if (!user || !routineSnapshot || !inputValue.trim() || isLoading) return

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

        {/* Routine to answer for */}
        <div className="mb-4 rounded-xl border border-border bg-card p-3 sm:p-4">
          <label htmlFor="chat-routine" className="block text-sm font-medium text-foreground">
            Routine to answer for
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="chat-routine"
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              value={selectedRoutineId ?? ""}
              onChange={(e) => {
                const nextId = e.target.value || null
                setSelectedRoutineId(nextId)
                const next = savedRoutines.find((r) => r.id === nextId) ?? null
                if (next) {
                  setRoutineSnapshot({ am: Array.isArray(next.am) ? next.am : [], pm: Array.isArray(next.pm) ? next.pm : [] })
                } else {
                  setRoutineSnapshot(null)
                }
              }}
              disabled={!user || loadingRoutines || savedRoutines.length === 0}
            >
              {savedRoutines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Defaults to your scheduled routine for today.
            </p>
          </div>

          {loadingRoutines && <p className="mt-2 text-xs text-muted-foreground">Loading routines…</p>}

          {user && !loadingRoutines && savedRoutines.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Create a routine first in <a href="/routine" className="underline hover:text-foreground">the routine builder</a>.
            </p>
          )}
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
            disabled={isLoading || !user || !routineSnapshot || loadingRoutines}
          />
          <Disclaimer className="text-xs">
            Results are for guidance only and do not replace professional dermatological advice.
          </Disclaimer>
        </div>
      </div>
    </div>
  )
}
