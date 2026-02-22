"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, User, Camera, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CombinedAuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [studentNumber, setStudentNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        if (data?.approvalPending && data?.student) {
          sessionStorage.setItem(
            "pendingStudentApproval",
            JSON.stringify({
              studentNo: data.student.studentNo,
              email: data.student.email,
              name: `${data.student.firstName} ${data.student.lastName}`,
            })
          )
          router.push("/auth?pending=approval")
          return
        }
        setError(data.message || "Invalid email or password")
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
      setStep(2)
    } catch (error) {
      console.error("Combined login error:", error)
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setStep(3)
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/profile?studentNo=${encodeURIComponent(studentNumber)}`)
      const data = await response.json()
      if (!response.ok || !data.success || data.student?.status !== "Active") {
        setError("Your account is pending approval. Please wait for admin activation.")
        sessionStorage.setItem(
          "pendingStudentApproval",
          JSON.stringify({
            studentNo: studentNumber,
            email,
            name: data?.student ? `${data.student.firstName} ${data.student.lastName}` : "",
          })
        )
        return
      }
      router.push("/dashboard")
    } catch (error) {
      console.error("Approval check error:", error)
      setError("Unable to verify account status.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
            <img
              src="/logo-circle.png"
              alt="HAU seal"
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">Combined Authentication</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 3 - Most Secure Method</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
            </div>
            <div className={`w-12 h-1 ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              3
            </div>
          </div>

          {/* Step 1: Email & Password */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">School Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="studentnumber@hau.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg">
                {isLoading ? "Verifying..." : "Continue to Step 2"}
              </Button>
            </form>
          )}

          {/* Step 2: Student Number */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
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

          {/* Step 3: Face Verification */}
          {step === 3 && (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Camera className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Face verification would activate your camera here
              </p>
              <Button onClick={handleFinalSubmit} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Complete Authentication"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
