"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, User, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function FaceRecognitionPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [studentNumber, setStudentNumber] = useState("")
  const [step, setStep] = useState<"input" | "camera" | "verifying" | "success">("input")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [faceDetected, setFaceDetected] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingFaceEnrollment")
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored) as { studentNo?: string; email?: string; name?: string }
      if (parsed?.studentNo) {
        const params = new URLSearchParams({
          studentNo: parsed.studentNo,
          email: parsed.email || "",
          name: parsed.name || "",
        })
        router.replace(`/face-enrollment?${params.toString()}`)
      }
    } catch (error) {
      console.error("Pending enrollment parse error:", error)
    }
  }, [router])

  useEffect(() => {
    if (step === "camera") {
      startCamera()
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [step])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      // Simulate face detection after 2 seconds
      setTimeout(() => setFaceDetected(true), 2000)
    } catch (error) {
      console.error("Camera access denied:", error)
    }
  }

  const handleStudentNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (studentNumber) {
      setStep("camera")
    }
  }

  const handleVerifyFace = () => {
    setStep("verifying")
    // Simulate verification
    setTimeout(() => {
      setStep("success")
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Facial Recognition Login</h1>
            <p className="text-sm text-muted-foreground">
              {step === "input" && "Enter your student number to begin"}
              {step === "camera" && "Position your face in the frame"}
              {step === "verifying" && "Verifying your identity..."}
              {step === "success" && "Verification successful!"}
            </p>
          </div>

          {step === "input" && (
            <form onSubmit={handleStudentNumberSubmit} className="space-y-6 max-w-md mx-auto">
              <div className="space-y-2">
                <Label htmlFor="studentNumber">Student Number</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="studentNumber"
                    type="text"
                    placeholder="2024-123456"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Continue to Face Verification
              </Button>
            </form>
          )}

          {step === "camera" && (
            <div className="space-y-6">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {faceDetected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-80 border-4 border-primary rounded-lg animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                {faceDetected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Face detected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-muted-foreground">Looking for face...</span>
                  </>
                )}
              </div>
              <Button onClick={handleVerifyFace} className="w-full" size="lg" disabled={!faceDetected}>
                Verify Identity
              </Button>
            </div>
          )}

          {step === "verifying" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">Analyzing facial features...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">Identity Verified!</p>
              <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
