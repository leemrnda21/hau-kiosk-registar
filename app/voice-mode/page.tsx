"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ConversationStep =
  | "welcome"
  | "auth-choice"
  | "email-input"
  | "password-input"
  | "student-number"
  | "face-verify"
  | "authenticated"

export default function VoiceModePage() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [conversation, setConversation] = useState<Array<{ speaker: "bot" | "user"; text: string }>>([])
  const [step, setStep] = useState<ConversationStep>("welcome")
  const [pendingStudentNumber, setPendingStudentNumber] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const hasSpokenRef = useRef(false);


  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      // Initialize Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false; // Only listen for one phrase at a time
        recognitionRef.current.interimResults = false; // Only process final results

        recognitionRef.current.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcriptText = event.results[i][0].transcript;
              setTranscript("");
              handleUserSpeech(transcriptText);
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }
      }

      // Start with welcome message
      speak(
        "Hello! Welcome to Holy Angel University Registrar Services. I'm here to help you request your documents. Would you like to login with your school email, student number with face recognition, or both?",
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

  // Helper to stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Helper to start listening
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current || isMuted) return;

    stopListening(); // Stop listening while bot is speaking

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      startListening(); // Resume listening after bot finishes
    };

    synthRef.current.speak(utterance);
    setConversation((prev) => [...prev, { speaker: "bot", text }]);
  };

  const handleUserSpeech = (text: string) => {
    setConversation((prev) => [...prev, { speaker: "user", text }])
    setTranscript("")

    const lowerText = text.toLowerCase()

    switch (step) {
      case "welcome":
  case "auth-choice": {
    // Check for greetings first
    if (
      lowerText.includes("hello") ||
      lowerText.includes("hi") ||
      lowerText.includes("hey")
    ) {
      speak(
        "Hello! What would you like to do? You can say email, face recognition, or both."
      );
    } else if (lowerText.includes("email") && !lowerText.includes("face")) {
      setStep("email-input");
      speak("Great! Please say your school email address clearly.");
    } else if (lowerText.includes("face") || lowerText.includes("recognition")) {
      setStep("student-number");
      speak("Perfect! Please say your student number clearly.");
    } else if (lowerText.includes("both") || lowerText.includes("combined")) {
      setStep("email-input");
      speak(
        "Excellent choice for maximum security. Let's start with your email address."
      );
    } else {
      speak(
        "I didn't catch that. Please say email, face recognition, or both."
      );
    }
    break;
  }


      case "email-input":
        speak(`I heard ${text}. Is that correct? Say yes to continue or no to try again.`)
        setStep("password-input")
        break

      case "password-input":
        if (lowerText.includes("yes")) {
          speak("Thank you. Now please say your password.")
        } else {
          setStep("authenticated")
          speak("Authentication successful! Welcome. Redirecting to your dashboard.")
          setTimeout(() => {
            sessionStorage.setItem("authenticated", "true")
            router.push("/dashboard")
          }, 3000)
        }
        break

      case "student-number":
        if (text.trim()) {
          setPendingStudentNumber(text.trim());
          speak(`I heard ${text}. Is that correct? Say yes to continue or no to try again.`);
          setStep("student-number-confirm");
        } else {
          speak("I didn't catch that. Please say your student number clearly.");
        }
        break

      case "student-number-confirm":
        if (lowerText.includes("yes")) {
          setStep("face-verify");
          speak("Perfect! Now I need to verify your face. Please look at the camera and make sure your face is well-lit. Blink when you're ready.");
        } else if (lowerText.includes("no")) {
          setPendingStudentNumber("");
          setStep("student-number");
          speak("Let's try again. Please say your student number clearly.");
        } else {
          speak(`Please say 'yes' to confirm your student number (${pendingStudentNumber}) or 'no' to retry.`);
        }
        break

      case "face-verify":
        if (lowerText.includes("yes")) {
          speak(
            "Perfect! Now I need to verify your face. Please look at the camera and make sure your face is well-lit. Blink when you're ready."
          );
          setTimeout(() => {
            setStep("authenticated");
            speak("Face verified! Welcome. Redirecting to your dashboard.");
            setTimeout(() => {
              sessionStorage.setItem("authenticated", "true");
              router.push("/dashboard");
            }, 3000);
          }, 3000);
        } else if (lowerText.includes("no")) {
          speak("Let's try again. Please say your student number clearly.");
          setStep("student-number");
        } else {
          speak("Please say 'yes' to confirm or 'no' to retry.");
        }
        break
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
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
        {/* Bot Avatar */}
        <div className="flex justify-center mb-8">
          <div
            className={`relative w-32 h-32 bg-primary rounded-full flex items-center justify-center ${isSpeaking ? "animate-pulse" : ""}`}
          >
            <span className="text-primary-foreground font-bold text-4xl">HAU</span>
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-75" />
            )}
          </div>
        </div>

        {/* Conversation Display */}
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

        {/* Live Transcript */}
        {transcript && (
          <Card className="p-4 mb-6 bg-accent">
            <p className="text-sm text-muted-foreground mb-1">Listening...</p>
            <p className="text-foreground">{transcript}</p>
          </Card>
        )}

        {/* Microphone Control */}
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

        {/* Instructions */}
        <Card className="mt-8 p-6 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-3">Voice Commands</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Say "email" to login with your school email</li>
            <li>• Say "face recognition" to use facial verification</li>
            <li>• Say "both" for combined authentication</li>
            <li>• Say "yes" or "no" to confirm or retry</li>
            <li>• Use the mute button to disable voice responses</li>
          </ul>
        </Card>
      </main>
    </div>
  )
}
