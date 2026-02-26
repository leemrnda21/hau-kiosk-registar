"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle, X, Send, Sparkles, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type SuggestedAction = {
  label: string
  href: string
}

type ChatResponse = {
  success: boolean
  answer?: string
  reminders?: string[]
  suggestedActions?: SuggestedAction[]
}

const starterPrompts = [
  "Where can I request my transcript?",
  "What is the status of my latest request?",
  "How do I email my ready documents?",
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    studentNumber: string
    fullName: string
    email: string
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [reminders, setReminders] = useState<string[]>([])
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([])
  const [hasNewReminder, setHasNewReminder] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const userString = sessionStorage.getItem("currentUser")
    if (userString) {
      setCurrentUser(JSON.parse(userString))
    }
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const loadInitial = async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentNo: currentUser.studentNumber, message: "" }),
        })
        const data = (await response.json()) as ChatResponse
        if (!response.ok || !data.success) {
          return
        }
        setReminders(data.reminders || [])
        setSuggestedActions(data.suggestedActions || [])
        if ((data.reminders || []).length > 0) {
          setHasNewReminder(true)
        }
      } catch (error) {
        console.error("Chat preload error:", error)
      }
    }

    loadInitial()
  }, [currentUser])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [isOpen, messages])

  const displayName = useMemo(() => {
    if (!currentUser?.fullName) {
      return "there"
    }
    const first = currentUser.fullName.split(" ")[0]
    return first || currentUser.fullName
  }, [currentUser])

  const handleSend = async (customMessage?: string) => {
    if (!currentUser || isSending) {
      return
    }

    const message = (customMessage ?? input).trim()
    if (!message) {
      return
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }]
    setMessages(nextMessages)
    setInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: currentUser.studentNumber,
          message,
          history: nextMessages.slice(-6),
        }),
      })
      const data = (await response.json()) as ChatResponse
      if (!response.ok || !data.success) {
        throw new Error("Chat request failed")
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "" }])
      setReminders(data.reminders || [])
      setSuggestedActions(data.suggestedActions || [])
      if ((data.reminders || []).length > 0) {
        setHasNewReminder(true)
      }
    } catch (error) {
      console.error("Chat send error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I could not respond right now. Please try again in a moment.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  if (!isReady || !currentUser) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <Card className="w-[320px] sm:w-[360px] bg-card/95 shadow-xl border border-border backdrop-blur">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Registrar Assistant</p>
                <p className="text-xs text-muted-foreground">Hi {displayName}</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto px-4 py-4 space-y-4">
            {reminders.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Bell className="w-4 h-4" />
                  Reminders
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {reminders.map((reminder) => (
                    <li key={reminder}>{reminder}</li>
                  ))}
                </ul>
              </div>
            )}

            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  I can help with transcript requests, registration steps, and tracking your documents.
                </p>
                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {suggestedActions.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Suggested actions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action) => (
                  <Button key={action.href} size="sm" variant="outline" asChild>
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about transcripts, requests, or enrollment"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSend()
                  }
                }}
              />
              <Button size="icon" onClick={() => handleSend()} disabled={isSending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Button
        size="icon-lg"
        onClick={() => {
          setIsOpen((prev) => !prev)
          setHasNewReminder(false)
        }}
        className="rounded-full shadow-lg relative"
        aria-label="Open chat assistant"
      >
        <MessageCircle className="w-5 h-5" />
        {hasNewReminder && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />
        )}
      </Button>
    </div>
  )
}
