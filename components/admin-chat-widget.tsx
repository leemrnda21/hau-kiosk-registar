"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, Send, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatResponse = {
  success: boolean
  answer?: string
}

const starterPrompts = [
  "list students",
  "show student names",
  "who are failing",
  "list passing students",
  "list document requests",
  "show requests for 2024-100010",
  "show grades for Elise Navarro",
  "get student 2024-123456",
]

export default function AdminChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("adminChatPrompts")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[]
        if (parsed.length > 0) {
          setPromptSuggestions(parsed)
          return
        }
      } catch {
        // ignore parse errors
      }
    }
    const shuffled = [...starterPrompts]
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)
      .slice(0, 4)
    sessionStorage.setItem("adminChatPrompts", JSON.stringify(shuffled))
    setPromptSuggestions(shuffled)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [isOpen, messages])

  const handleSend = async (customMessage?: string) => {
    if (isSending) {
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
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: nextMessages.slice(-6) }),
      })
      const data = (await response.json()) as ChatResponse
      if (!response.ok || !data.success) {
        throw new Error("Chat request failed")
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "" }])
    } catch (error) {
      console.error("Admin chat send error:", error)
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <Card className="w-[320px] sm:w-[360px] bg-card/95 shadow-xl border border-border backdrop-blur">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Admin Assistant</p>
                <p className="text-xs text-muted-foreground">Student analytics & tools</p>
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
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Ask me for student data, names, or failing grades.</p>
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((prompt) => (
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
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-line ${
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

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask for student lists or failing grades"
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
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full shadow-lg"
        aria-label="Open admin chat assistant"
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    </div>
  )
}
