"use client"

import React, { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  detectFaceInImage,
  loadModels,
  calculate3DDepth,
} from "@/lib/facial-recognition-pretrained"
import { setCameraDirection } from "@/lib/camera-depth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Camera, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react"

declare global {
  interface Window {
    faceapi: any
  }
}

export default function FaceEnrollmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [enrollmentStatus, setEnrollmentStatus] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cameraDirection, setCameraDir] = useState<"left" | "right" | "center">("center")
  const [capturedFaceCount, setCapturedFaceCount] = useState(0)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([])
  const [enrollmentComplete, setEnrollmentComplete] = useState(false)
  const [showExitPrompt, setShowExitPrompt] = useState(false)

  useEffect(() => {
    const studentNoParam = searchParams.get("studentNo")
    const nameParam = searchParams.get("name")
    const emailParam = searchParams.get("email")

    if (studentNoParam) setStudentId(studentNoParam)
    if (nameParam) setName(nameParam)
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  useEffect(() => {
    if (!studentId || !enrollmentComplete) {
      return
    }
    const finalizeEnrollment = async () => {
      try {
        const response = await fetch(
          `/api/profile?studentNo=${encodeURIComponent(studentId)}`
        )
        const data = await response.json()
        if (!response.ok || !data.success || !data.student) {
          return
        }
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            studentNumber: data.student.studentNo,
            fullName: `${data.student.firstName} ${data.student.lastName}`,
            email: data.student.email,
          })
        )
      } catch (error) {
        console.error("Finalize enrollment error:", error)
      }
    }

    finalizeEnrollment()
  }, [studentId, enrollmentComplete])

  useEffect(() => {
    if (!studentId || enrollmentComplete) {
      return
    }
    sessionStorage.setItem(
      "pendingFaceEnrollment",
      JSON.stringify({ studentNo: studentId, email, name })
    )
  }, [studentId, email, name, enrollmentComplete])

  useEffect(() => {
    // Load face-api.js script
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
    script.async = true
    script.onload = async () => {
      console.log("face-api.js loaded")
      const tfScript = document.createElement("script")
      tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js"
      tfScript.async = true
      tfScript.onload = async () => {
        console.log("TensorFlow.js loaded")
        const backendScript = document.createElement("script")
        backendScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.20.0/dist/tf-backend-webgl.min.js"
        backendScript.async = true
        backendScript.onload = async () => {
          console.log("TensorFlow.js WebGL backend loaded, starting model load...")
          try {
            await loadModels()
            setModelsLoaded(true)
            console.log("Models loaded successfully")
          } catch (error) {
            console.error("Error loading models:", error)
            // Try again after 2 seconds
            setTimeout(async () => {
              try {
                await loadModels()
                setModelsLoaded(true)
              } catch (retryError) {
                console.error("Retry failed:", retryError)
              }
            }, 2000)
          }
        }
        backendScript.onerror = () => console.error("Failed to load WebGL backend")
        document.body.appendChild(backendScript)
      }
      tfScript.onerror = () => console.error("Failed to load TensorFlow.js")
      document.body.appendChild(tfScript)
    }
    script.onerror = () => console.error("Failed to load face-api.js")
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
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
        alert("Please allow camera access to enroll your face.")
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  const captureForEnrollment = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsProcessing(true)
    setEnrollmentStatus("Processing face capture...")

    try {
      // Check if models are loaded
      if (!window.faceapi || !window.faceapi.nets.tinyFaceDetector || !window.faceapi.nets.tinyFaceDetector.params) {
        setEnrollmentStatus("⏳ Models are still loading. Please wait a moment and try again.")
        setIsProcessing(false)
        return
      }

      const context = canvasRef.current.getContext("2d")
      if (!context) {
        setEnrollmentStatus("❌ Canvas context error.")
        setIsProcessing(false)
        return
      }

      // Draw video frame to canvas
      try {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
      } catch (drawError) {
        console.error("Canvas draw error:", drawError)
        setEnrollmentStatus("❌ Failed to capture video frame.")
        setIsProcessing(false)
        return
      }

      // Detect faces with timeout
      let detections: Awaited<ReturnType<typeof detectFaceInImage>> | null = null
      try {
        const detectionTimeout = new Promise((resolve) => {
          setTimeout(() => resolve(null), 8000) // 8 second timeout
        })

        const detectionPromise = detectFaceInImage(canvasRef.current)
        detections = (await Promise.race([detectionPromise, detectionTimeout])) as
          | Awaited<ReturnType<typeof detectFaceInImage>>
          | null
      } catch (detectionError) {
        console.error("Face detection error:", detectionError)
        setEnrollmentStatus(`❌ Face detection error: ${String(detectionError).substring(0, 50)}`)
        setIsProcessing(false)
        return
      }

      if (!detections) {
        setEnrollmentStatus("❌ Face detection timed out. Please try again.")
        setIsProcessing(false)
        return
      }

      if (detections.status === "models-not-ready") {
        setEnrollmentStatus("⏳ Models are still loading. Please wait a moment and try again.")
        setIsProcessing(false)
        return
      }

      const detectionList = detections.detections

      if (detectionList.length === 0) {
        setEnrollmentStatus("❌ No face detected. Please look at the camera and try again.")
        setIsProcessing(false)
        return
      }

      if (detectionList.length > 1) {
        setEnrollmentStatus("❌ Multiple faces detected. Please ensure only you are in the frame.")
        setIsProcessing(false)
        return
      }

      try {
        const detection = detectionList[0]

        if (!detection.descriptor) {
          setEnrollmentStatus("❌ Failed to extract face descriptor.")
          setIsProcessing(false)
          return
        }

        const faceDescriptor = Array.from(detection.descriptor) as number[]

        if (!detection.landmarks) {
          setEnrollmentStatus("❌ Failed to extract facial landmarks.")
          setIsProcessing(false)
          return
        }

        // Landmarks can be an array or have a positions() method
        const landmarks = typeof detection.landmarks.positions === "function" 
          ? detection.landmarks.positions() 
          : detection.landmarks

        const depthData = calculate3DDepth(landmarks)

        // Store the descriptor for averaging
        const newDescriptors = [...capturedDescriptors, faceDescriptor]
        setCapturedDescriptors(newDescriptors)
        setCapturedFaceCount((prev) => prev + 1)

        if (newDescriptors.length < 3) {
          const remaining = 3 - newDescriptors.length
          setEnrollmentStatus(`✓ Face ${newDescriptors.length}/3 captured successfully. Please capture ${remaining} more angle${remaining !== 1 ? "s" : ""}.`)
        } else {
          // After 3 captures, average the descriptors and enroll
          try {
            // Calculate average descriptor from all 3 captures
            const averagedDescriptor = new Array(128).fill(0)
            for (let i = 0; i < 128; i++) {
              let sum = 0
              for (const descriptor of newDescriptors) {
                sum += descriptor[i] || 0
              }
              averagedDescriptor[i] = sum / newDescriptors.length
            }

            // Store enrollment with email
            const response = await fetch("/api/face-enrollment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentNo: studentId,
                descriptor: averagedDescriptor,
                depthData,
              }),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
              setEnrollmentStatus(result.message || "❌ Enrollment failed. Please try again.")
              return
            }

            setEnrollmentStatus(`✓ Enrollment Successful! Your face has been added to the database. Student ID: ${studentId}, Email: ${email}`)
            setEnrollmentComplete(true)
            setCapturedFaceCount(0)
            setCapturedDescriptors([])
            sessionStorage.removeItem("pendingFaceEnrollment")
            sessionStorage.setItem("faceEnrollmentComplete", "true")
          } catch (enrollError) {
            console.error("Enrollment error:", enrollError)
            setEnrollmentStatus(`❌ Enrollment failed: ${String(enrollError).substring(0, 50)}`)
          }
        }
      } catch (processError) {
        console.error("Processing error:", processError)
        setEnrollmentStatus(`❌ Processing error: ${String(processError).substring(0, 50)}`)
        setIsProcessing(false)
        return
      }
    } catch (error) {
      console.error("Enrollment error:", error)
      setEnrollmentStatus(`❌ Unexpected error: ${String(error).substring(0, 60)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCameraDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const direction = e.target.value as "left" | "right" | "center"
    setCameraDir(direction)
    setCameraDirection(direction)
  }

  const resetEnrollment = () => {
    setCapturedFaceCount(0)
    setEnrollmentStatus("")
    setEnrollmentComplete(false)
  }

  useEffect(() => {
    if (!studentId) {
      return
    }
    const checkEnrollment = async () => {
      try {
        const response = await fetch(
          `/api/face-enrollment?studentNo=${encodeURIComponent(studentId)}`
        )
        const data = await response.json()
        if (response.ok && data?.success && data?.enrolled) {
          setEnrollmentComplete(true)
          sessionStorage.removeItem("pendingFaceEnrollment")
          sessionStorage.setItem("faceEnrollmentComplete", "true")
        }
      } catch (error) {
        console.error("Face enrollment check error:", error)
      }
    }

    checkEnrollment()
  }, [studentId])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-circle.png" alt="HAU seal" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="font-bold text-foreground">Holy Angel University</h1>
              <p className="text-xs text-muted-foreground">Face Enrollment</p>
            </div>
          </div>
          {!enrollmentComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitPrompt(true)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-8">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  <ShieldCheck className="w-4 h-4" />
                  Required to activate your account
                </div>
                <h2 className="text-2xl font-bold text-foreground mt-3">Face Enrollment</h2>
                <p className="text-sm text-muted-foreground">
                  Capture three angles so we can securely verify your identity when you log in.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${modelsLoaded ? "bg-green-500" : "bg-yellow-400"}`} />
                {modelsLoaded ? "Models ready" : "Loading models"}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-id">Student Number</Label>
                  <Input
                    id="student-id"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="2024-123456"
                    disabled={enrollmentComplete}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input
                    id="student-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    disabled={enrollmentComplete}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email</Label>
                  <Input
                    id="student-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@hau.edu.ph"
                    disabled={enrollmentComplete}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Capture guidance</p>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <li>• Center your face within the frame.</li>
                    <li>• Capture three angles: center, left, right.</li>
                    <li>• Avoid backlight; keep your face well lit.</li>
                    <li>• Remove masks or large accessories.</li>
                  </ul>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-xs text-muted-foreground">
                  <span>Camera status</span>
                  <span className={isStreaming ? "text-green-600" : "text-red-600"}>
                    {isStreaming ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  Captures
                </div>
                <span className="text-sm font-semibold text-foreground">{capturedFaceCount}/3</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(capturedFaceCount / 3) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={captureForEnrollment}
                  disabled={
                    isProcessing ||
                    !studentId ||
                    !name ||
                    !isStreaming ||
                    !modelsLoaded ||
                    enrollmentComplete
                  }
                >
                  {!modelsLoaded
                    ? "Loading models..."
                    : isProcessing
                      ? "Processing..."
                      : capturedFaceCount >= 2
                        ? "Capture final angle"
                        : "Capture face"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetEnrollment}
                  disabled={isProcessing}
                >
                  Reset
                </Button>
              </div>
            </div>

            {enrollmentStatus && (
              <div
                className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
                  enrollmentStatus.includes("❌")
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {enrollmentStatus}
              </div>
            )}

            {enrollmentComplete && (
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Face enrollment complete. Your account is now active.
                </div>
                <Button
                  onClick={() => router.push("/auth/email")}
                  className="w-full"
                >
                  Continue to Login
                </Button>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-6 bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Why this step matters</p>
                  <p className="text-sm text-muted-foreground">
                    Face enrollment protects your records and speeds up verification for future requests.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span>Identity verification</span>
                  <span className="text-foreground">Required</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span>Estimated time</span>
                  <span className="text-foreground">2-3 minutes</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span>Captured angles</span>
                  <span className="text-foreground">3</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold text-foreground">Camera settings</p>
              <div className="mt-3 flex items-center gap-3">
                <Label htmlFor="camera-direction" className="text-xs text-muted-foreground">
                  Mirror direction
                </Label>
                <select
                  id="camera-direction"
                  value={cameraDirection}
                  onChange={handleCameraDirectionChange}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="left">Mirror left</option>
                  <option value="center">Normal</option>
                  <option value="right">Mirror right</option>
                </select>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm font-semibold text-foreground">Live preview</p>
              <div className="mt-4 relative overflow-hidden rounded-xl border border-border">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="h-[280px] w-full object-cover"
                  style={{
                    transform: cameraDirection === "left" ? "scaleX(-1)" : "scaleX(1)",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-32 rounded-2xl border-2 border-primary/80" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      {showExitPrompt && !enrollmentComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-foreground">Finish enrollment first</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Face enrollment is required before you can use your account.
            </p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => setShowExitPrompt(false)}>
                Continue enrollment
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  sessionStorage.removeItem("pendingFaceEnrollment")
                  router.push("/auth")
                }}
              >
                Back to login
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
