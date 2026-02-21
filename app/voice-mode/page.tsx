"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ConversationStep =
  | "welcome"
  | "auth-choice"
  | "email-input"
  | "email-confirm"
  | "password-input"
  | "student-number"
  | "student-number-confirm"
  | "face-verify"
  | "authenticated"

export default function VoiceModePage() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [diagnostics, setDiagnostics] = useState({
    speechSupported: false,
    secureContext: false,
    micPermission: "unknown" as "unknown" | "granted" | "denied" | "prompt",
  })
  const [conversation, setConversation] = useState<Array<{ speaker: "bot" | "user"; text: string }>>([])
  const [step, setStep] = useState<ConversationStep>("welcome")
  const [pendingStudentNumber, setPendingStudentNumber] = useState<string>("")
  const [pendingEmail, setPendingEmail] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const handleUserSpeechRef = useRef<(text: string) => void>(() => undefined)
  const autoListenRef = useRef(true)
  const receivedResultRef = useRef(false)
  const sessionActiveRef = useRef(false)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<number | null>(null)
  const listenStartRef = useRef<number | null>(null)
  const maxListenMs = 8000

  const normalizeEmailFromSpeech = (spoken: string) => {
    const base = spoken
      .toLowerCase()
      .replace(/\bemail\b/g, " ")
      .replace(/\baddress\b/g, " ")
      .replace(/\bstudent\b/g, " ")
      .replace(/\b(at)\b/g, "@")
      .replace(/\b(dot)\b/g, ".")
      .replace(/\b(underscore)\b/g, "_")
      .replace(/\b(dash|hyphen)\b/g, "-")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9@._-]/g, "")

    if (!base) return ""

    const username = base.includes("@") ? base.split("@")[0] : base
    const cleanedUser = username.replace(/[^a-z0-9._-]/g, "")
    if (!cleanedUser) return ""
    return `${cleanedUser}@student.hau.edu.ph`
  }

  const formatEmailForSpeech = (email: string) => {
    return email
      .replace(/@/g, " at ")
      .replace(/\./g, " dot ")
      .replace(/_/g, " underscore ")
      .replace(/-/g, " dash ")
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setDiagnostics((prev) => ({
        ...prev,
        speechSupported: Boolean(SpeechRecognition),
        secureContext: window.isSecureContext || location.hostname === "localhost",
      }))

      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "microphone" as PermissionName })
          .then((result) => {
            setDiagnostics((prev) => ({
              ...prev,
              micPermission: result.state,
            }))
          })
          .catch(() => undefined)
      }
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"
        recognitionRef.current.maxAlternatives = 1

        recognitionRef.current.onresult = (event: any) => {
          receivedResultRef.current = true
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptText = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                setTranscript("")
                setStatusMessage("")
                sessionActiveRef.current = false
                try {
                  recognitionRef.current?.stop()
                } catch (error) {
                  // ignore
                }
                handleUserSpeechRef.current(transcriptText)
              } else {
                setTranscript(transcriptText)
              }
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          setIsListening(false)
          const message = event?.error ? `Speech error: ${event.error}. Tap to try again.` : "Speech error. Tap to try again."
          setStatusMessage(message)
        }

        recognitionRef.current.onstart = () => {
          setStatusMessage("Listening...")
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          if (retryTimeoutRef.current) {
            window.clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
          }
          if (sessionActiveRef.current && !receivedResultRef.current) {
            retryCountRef.current += 1
            const listenStart = listenStartRef.current || Date.now()
            const elapsed = Date.now() - listenStart
            if (elapsed < maxListenMs) {
              retryTimeoutRef.current = window.setTimeout(() => {
                if (sessionActiveRef.current && !isSpeaking) {
                  try {
                    recognitionRef.current?.start()
                    setIsListening(true)
                  } catch (error) {
                    setStatusMessage("Tap to try again.")
                  }
                }
              }, 350)
            } else {
              setStatusMessage("I didn't hear anything. Tap to try again.")
              sessionActiveRef.current = false
            }
          }
          receivedResultRef.current = false
        }
      }

      speak(
        "Hello! Welcome to Holy Angel University Registrar Services. I'm here to help with login and document requests. Would you like to use your school email, student number with face recognition, or both?",
      )
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setStatusMessage("Speech recognition requires HTTPS or localhost.")
      return
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setDiagnostics((prev) => ({
          ...prev,
          micPermission: "granted",
        }))
      }
    } catch (error) {
      setStatusMessage("Microphone access is blocked. Please allow mic access and try again.")
      setDiagnostics((prev) => ({
        ...prev,
        micPermission: "denied",
      }))
      return
    }

    setStatusMessage("")
    receivedResultRef.current = false
    retryCountRef.current = 0
    sessionActiveRef.current = true
    listenStartRef.current = Date.now()
    recognitionRef.current.start()
    setIsListening(true)
  }

  const speak = (text: string) => {
    setConversation((prev) => [...prev, { speaker: "bot", text }])

    if (!synthRef.current || isMuted) {
      setIsSpeaking(false)
      if (autoListenRef.current) {
        startListening().catch(() => undefined)
      }
      return
    }

    stopListening()
    setStatusMessage("")

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      if (autoListenRef.current) {
        startListening().catch(() => undefined)
      }
    }

    synthRef.current.speak(utterance)
  }

  const handleUserSpeech = async (text: string) => {
    setConversation((prev) => [...prev, { speaker: "user", text }])
    setTranscript("")

    const lowerText = text.toLowerCase()
    const activeStep = step

    switch (activeStep) {
      case "welcome":
      case "auth-choice": {
        const commandText = lowerText.replace(/[^a-z]/g, "")
        if (lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("hey")) {
          speak("Hello! You can say email, face recognition, or both.")
        } else if (commandText.includes("email") && !commandText.includes("face")) {
          setStep("email-input")
          speak("Great! Please say your email username, like vbmiranda.")
        } else if (commandText.includes("face") || lowerText.includes("recognition")) {
          setStep("student-number")
          speak("Perfect! Please say your student number clearly.")
        } else if (commandText.includes("both") || lowerText.includes("combined")) {
          setStep("email-input")
          speak("Excellent choice. Let's start with your email username, like vbmiranda.")
        } else {
          speak("I didn't catch that. Please say email, face recognition, or both.")
        }
        break
      }

      case "email-input": {
        const normalizedEmail = normalizeEmailFromSpeech(text)
        if (!normalizedEmail) {
          speak("I didn't catch that. Please say your email username, like vbmiranda.")
          break
        }

        setPendingEmail(normalizedEmail)
        speak(`I heard ${formatEmailForSpeech(normalizedEmail)}. Is that correct? Say yes to continue or no to try again.`)
        setStep("email-confirm")
        break
      }

      case "email-confirm":
        if (lowerText.includes("yes")) {
          setStep("password-input")
          speak("Thank you. Now please say your password.")
        } else if (lowerText.includes("no")) {
          setPendingEmail("")
          setStep("email-input")
          speak("Okay, let's try again. Please say your email username clearly.")
        } else {
          speak("Please say yes to confirm your email or no to try again.")
        }
        break

      case "password-input":
        if (!text.trim()) {
          speak("I didn't catch that. Please say your password.")
          break
        }

        if (!pendingEmail) {
          setStep("email-input")
          speak("I need your email first. Please say your email username.")
          break
        }

        const spokenPassword = text.replace(/\s+/g, "")
        setStatusMessage("Verifying credentials...")
        setIsVerifying(true)
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: pendingEmail, password: spokenPassword }),
          })

          const data = await response.json()
          if (!response.ok || !data.success) {
            setIsVerifying(false)
            setStatusMessage("")
            speak(data.message || "Incorrect password. Please try again.")
            setStep("password-input")
            break
          }

          sessionStorage.setItem("authenticated", "true")
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify({
              studentNumber: data.student.studentNo,
              fullName: `${data.student.firstName} ${data.student.lastName}`,
              email: data.student.email,
            })
          )

          setStep("authenticated")
          setIsVerifying(false)
          speak("Authentication successful! Welcome. Redirecting to your dashboard.")
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        } catch (error) {
          setIsVerifying(false)
          setStatusMessage("")
          speak("Login failed. Please try again.")
          setStep("password-input")
        }
        break


      case "student-number":
        if (text.trim()) {
          const normalizedStudentNumber = text.replace(/\s+/g, "")
          setPendingStudentNumber(normalizedStudentNumber)
          speak(`I heard ${normalizedStudentNumber}. Is that correct? Say yes to continue or no to try again.`)
          setStep("student-number-confirm")
        } else {
          speak("I didn't catch that. Please say your student number clearly.")
        }
        break

      case "student-number-confirm":
        if (lowerText.includes("yes")) {
          setStep("face-verify")
          speak("Great. Redirecting you to face verification now.")
          setTimeout(() => {
            router.push(`/auth/face-student?studentNo=${encodeURIComponent(pendingStudentNumber)}`)
          }, 800)
        } else if (lowerText.includes("no")) {
          setPendingStudentNumber("")
          setStep("student-number")
          speak("Let's try again. Please say your student number clearly.")
        } else {
          speak(`Please say 'yes' to confirm your student number (${pendingStudentNumber}) or 'no' to retry.`)
        }
        break

      case "face-verify":
        if (lowerText.includes("no")) {
          speak("Let's try again. Please say your student number clearly.")
          setStep("student-number")
        } else {
          speak("Please say 'yes' to continue or 'no' to retry.")
        }
        break
    }
  }

  handleUserSpeechRef.current = handleUserSpeech

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Safari, Chrome, or Edge.")
      return
    }

    if (isListening) {
      sessionActiveRef.current = false
      listenStartRef.current = null
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript("")
      setStatusMessage("")
      retryCountRef.current = 0
      sessionActiveRef.current = true
      listenStartRef.current = Date.now()
      startListening().catch(() => undefined)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }

  const resetConversation = () => {
    setConversation([])
    setStep("welcome")
    setTranscript("")
    setStatusMessage("")
    sessionActiveRef.current = false
    retryCountRef.current = 0
    listenStartRef.current = null
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    speak(
      "Let's start over. Would you like to login with your school email, student number with face recognition, or both?",
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Voice Mode
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={resetConversation}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/touch-mode">Switch to Touch Mode</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center mb-8">
          <div
            className={`relative w-32 h-32 bg-primary rounded-full flex items-center justify-center ${
              isSpeaking ? "animate-pulse" : ""
            }`}
          >
            <img
              src="/logo-circle.png"
              alt="HAU seal"
              className="w-28 h-28 rounded-full object-cover"
            />
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-75" />
            )}
          </div>
        </div>

        <Card className="p-6 mb-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {conversation.length === 0 ? (
              <p className="text-center text-muted-foreground">Conversation will appear here...</p>
            ) : (
              conversation.map((message, index) => (
                <div key={index} className={`flex ${message.speaker === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.speaker === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{message.speaker === "user" ? "You" : "HAU Assistant"}</p>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {(transcript || statusMessage || isVerifying) && (
          <Card className="p-4 mb-6 bg-accent">
            <p className="text-sm text-muted-foreground mb-1">
              {isListening ? "Listening..." : "Ready"}
            </p>
            {transcript ? <p className="text-foreground">{transcript}</p> : null}
            {statusMessage ? <p className="text-foreground">{statusMessage}</p> : null}
            {isVerifying ? <p className="text-foreground">Checking credentials...</p> : null}
          </Card>
        )}

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isListening ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </button>
          <p className="text-sm text-muted-foreground">{isListening ? "Tap to stop listening" : "Tap to talk"}</p>
        </div>

        <Card className="mt-8 p-6 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-3">Voice Commands</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Say "email" to login with your school email</li>
            <li>• Say "face recognition" to use facial verification</li>
            <li>• Say "both" for combined authentication</li>
            <li>• Say "yes" or "no" to confirm or retry</li>
            <li>• Use the mute button to disable voice responses</li>
          </ul>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Speech support: {diagnostics.speechSupported ? "available" : "not available"}</p>
            <p>Secure context: {diagnostics.secureContext ? "yes" : "no"}</p>
            <p>Mic permission: {diagnostics.micPermission}</p>
          </div>
        </Card>
      </main>
    </div>
  )
}
