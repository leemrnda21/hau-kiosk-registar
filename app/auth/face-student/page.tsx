"use client"

import React, { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { detectFaceInImage, recognizeFace, loadModels } from "@/lib/facial-recognition-pretrained"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Camera, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

declare global {
  interface Window {
    faceapi: any
  }
}

export default function FaceStudentLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [studentNumber, setStudentNumber] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [step, setStep] = useState<"input" | "capture" | "verify">("input")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const autoStartRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingFaceEnrollment")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { studentNo?: string; email?: string; name?: string }
        if (parsed?.studentNo) {
          const params = new URLSearchParams({
            studentNo: parsed.studentNo,
            email: parsed.email || "",
            name: parsed.name || "",
          })
          router.replace(`/face-enrollment?${params.toString()}`)
          return
        }
      } catch (error) {
        console.error("Pending enrollment parse error:", error)
      }
    }

    const userString = sessionStorage.getItem("currentUser")
    if (!userString) {
      return
    }
    let user: { studentNumber?: string; fullName?: string; email?: string } | null = null
    try {
      user = JSON.parse(userString)
    } catch (error) {
      console.error("Current user parse error:", error)
      return
    }

    if (!user?.studentNumber) {
      return
    }

    const checkEnrollment = async () => {
      try {
        const response = await fetch(
          `/api/face-enrollment?studentNo=${encodeURIComponent(user.studentNumber as string)}`
        )
        const data = await response.json()
        if (response.ok && data?.success && data?.enrolled) {
          sessionStorage.setItem("faceEnrollmentComplete", "true")
          return
        }

        const pending = {
          studentNo: user.studentNumber,
          email: user.email || "",
          name: user.fullName || "",
        }
        sessionStorage.setItem("pendingFaceEnrollment", JSON.stringify(pending))
        const params = new URLSearchParams({
          studentNo: pending.studentNo || "",
          email: pending.email,
          name: pending.name,
        })
        router.replace(`/face-enrollment?${params.toString()}`)
      } catch (error) {
        console.error("Face enrollment check error:", error)
      }
    }

    checkEnrollment()
  }, [router])

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingStudentApproval")
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored) as { studentNo?: string; email?: string; name?: string }
      if (parsed?.studentNo) {
        setResult({
          success: false,
          message: "Your account is pending approval. Please wait for admin activation.",
        })
        setStep("input")
      }
    } catch (error) {
      console.error("Pending approval parse error:", error)
    }
  }, [])

  // Load face-api.js and TensorFlow
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
    script.async = true
    script.onload = async () => {
      const tfScript = document.createElement("script")
      tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js"
      tfScript.async = true
      tfScript.onload = async () => {
        const backendScript = document.createElement("script")
        backendScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.20.0/dist/tf-backend-webgl.min.js"
        backendScript.async = true
        backendScript.onload = () => {
          loadModels().then(() => setModelsLoaded(true))
        }
        document.body.appendChild(backendScript)
      }
      document.body.appendChild(tfScript)
    }
    document.body.appendChild(script)
  }, [])

  // Start camera when step is 'capture'
  useEffect(() => {
    if (step !== "capture") return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsStreaming(true)
        }
      } catch (error) {
        console.error("Camera access denied:", error)
        setResult({ success: false, message: "Please allow camera access." })
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [step])

  const handleStartCapture = async (overrideStudentNumber?: string) => {
    const value = overrideStudentNumber ?? studentNumber
    if (!value.trim()) {
      setResult({ success: false, message: "Please enter a student number." })
      return
    }

    let data = null
    try {
      const response = await fetch(`/api/face-enrollment?studentNo=${encodeURIComponent(value)}`)
      data = await response.json()

      if (!response.ok || !data.success) {
        setResult({ success: false, message: data.message || "Student number not found in database." })
        return
      }
    } catch (error) {
      setResult({ success: false, message: "Unable to reach enrollment service. Please try again." })
      return
    }

    if (!data.enrolled) {
      setResult({ success: false, message: "No face enrollment found for this student. Please enroll first." })
      return
    }

    setStep("capture")
    setResult(null)
  }

  const handleStartCaptureClick = () => {
    handleStartCapture().catch(() => undefined)
  }

  useEffect(() => {
    const studentNoParam = searchParams.get("studentNo")
    if (!studentNoParam || autoStartRef.current) return

    autoStartRef.current = true
    setStudentNumber(studentNoParam)
    handleStartCapture(studentNoParam)
  }, [searchParams])

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsProcessing(true)
    try {
      const context = canvasRef.current.getContext("2d")
      if (!context) return

      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      context.drawImage(videoRef.current, 0, 0)

      if (window.faceapi) {
        // Recognize face and verify against database
        const recognition = await recognizeFace(canvasRef.current, studentNumber)

        if (!recognition.verified && recognition.message.includes("Models are still loading")) {
          setFaceDetected(false)
          setResult({
            success: false,
            message: recognition.message
          })
          return
        }

        // For login, verify that:
        // 1. A face is detected and verified in the database
        // 2. The recognized student matches the entered student number
        if (recognition.verified && recognition.studentId === studentNumber) {
          const approvalResponse = await fetch(
            `/api/profile?studentNo=${encodeURIComponent(recognition.studentId)}`
          )
          const approvalData = await approvalResponse.json()
          if (!approvalResponse.ok || !approvalData.success || approvalData.student?.status !== "Active") {
            sessionStorage.setItem(
              "pendingStudentApproval",
              JSON.stringify({
                studentNo: recognition.studentId,
                email: recognition.email,
                name: recognition.name,
              })
            )
            setResult({
              success: false,
              message: "Your account is pending approval. Please wait for admin activation.",
            })
            return
          }

          setStep("verify")
          setFaceDetected(true)
          if (recognition.name && recognition.email) {
            sessionStorage.setItem(
              "currentUser",
              JSON.stringify({
                studentNumber: recognition.studentId,
                fullName: recognition.name,
                email: recognition.email,
              })
            )
            sessionStorage.setItem("faceEnrollmentComplete", "true")
            sessionStorage.removeItem("pendingFaceEnrollment")
          }
          setResult({
            success: true,
            message: "Face verified! Redirecting..."
          })

          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        } else if (!recognition.verified) {
          setFaceDetected(false)
          setResult({
            success: false,
            message: `Face not recognized or not found in database. ${recognition.message}`
          })
        } else if (recognition.studentId !== studentNumber) {
          setFaceDetected(false)
          setResult({
            success: false,
            message: `Face belongs to a different student (${recognition.studentId}). Please try again.`
          })
        }
      }
    } catch (error) {
      console.error("Verification error:", error)
      setResult({ success: false, message: "Error during face verification. Please try again." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToInput = () => {
    setStep("input")
    setStudentNumber("")
    setResult(null)
    setFaceDetected(false)
  }

    return (
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
            <img src="/logo-circle.png" alt="HAU seal" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="font-bold text-foreground">Holy Angel University</h1>
              <p className="text-xs text-muted-foreground">Face & Student Number Login</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Auth
              </Link>
            </Button>
          </div>

          {step === 'input' && (
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Face & Student ID Login</h2>
                <p className="text-sm text-muted-foreground">Enter your student number to verify your face</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="student-number">Student Number</Label>
                  <Input
                    id="student-number"
                    placeholder="e.g., 20876916"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleStartCaptureClick()}
                  />
                </div>

                {result && (
                  <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  </div>
                )}

                <Button onClick={handleStartCaptureClick} className="w-full" size="lg">
                  Continue to Face Capture
                </Button>
              </div>
            </Card>
          )}

          {step === 'capture' && (
            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Capture Your Face</h2>
                <p className="text-sm text-muted-foreground">Position your face in the center and click capture</p>
              </div>

              <div className="space-y-6">
                {/* Model Status */}
                <div className={`p-3 rounded-lg text-sm ${modelsLoaded ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
                  {modelsLoaded ? '✓ Models loaded' : '⏳ Loading models...'}
                </div>

                {/* Camera Feed */}
                <div className="text-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full rounded-lg border-2 ${faceDetected ? 'border-green-500' : 'border-gray-300'}`}
                  />
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleBackToInput}
                    variant="outline"
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
          <Button
            onClick={captureAndVerify}
            disabled={isProcessing || !modelsLoaded}
            className="flex-1"
          >
            {!modelsLoaded ? "Loading models..." : isProcessing ? "Verifying..." : "Capture & Verify"}
          </Button>
                </div>

                {result && (
                  <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
