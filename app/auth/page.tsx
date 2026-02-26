"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, User, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AuthPage() {
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [pendingEnrollment, setPendingEnrollment] = useState<{
    studentNo: string
    email: string
    name: string
  } | null>(null)
  const [pendingApproval, setPendingApproval] = useState<{
    studentNo: string
    email: string
    name: string
  } | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "active" | "unknown">("unknown")
  const [isCheckingApproval, setIsCheckingApproval] = useState(false)
  const [forceEmailLogin, setForceEmailLogin] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingFaceEnrollment")
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored) as { studentNo?: string; email?: string; name?: string }
      if (parsed?.studentNo) {
        setPendingEnrollment({
          studentNo: parsed.studentNo,
          email: parsed.email || "",
          name: parsed.name || "",
        })
      }
    } catch (error) {
      console.error("Pending enrollment parse error:", error)
    }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingStudentApproval")
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored) as { studentNo?: string; email?: string; name?: string }
      if (parsed?.studentNo) {
        setPendingApproval({
          studentNo: parsed.studentNo,
          email: parsed.email || "",
          name: parsed.name || "",
        })
        setForceEmailLogin(true)
        setApprovalStatus("pending")
      }
    } catch (error) {
      console.error("Pending approval parse error:", error)
    }
  }, [])

  useEffect(() => {
    if (!pendingApproval?.studentNo) {
      return
    }

    let intervalId: ReturnType<typeof setInterval> | null = null

    const checkStatus = async () => {
      setIsCheckingApproval(true)
      try {
        const url = new URL("/api/profile", window.location.origin)
        url.searchParams.set("studentNo", pendingApproval.studentNo)
        const response = await fetch(url)
        const data = await response.json()
        if (response.ok && data?.success) {
          const status = String(data.student?.status || "").toLowerCase()
          if (status === "active") {
            setApprovalStatus("active")
            setSelectedMethod("email")
            if (!redirecting) {
              setRedirecting(true)
              setTimeout(() => {
                router.push("/auth/email")
              }, 2500)
            }
            return
          }
          setApprovalStatus("pending")
          return
        }
        setApprovalStatus("pending")
      } catch (error) {
        console.error("Approval status check error:", error)
        setApprovalStatus("pending")
      } finally {
        setIsCheckingApproval(false)
      }
    }

    checkStatus()
    intervalId = setInterval(checkStatus, 5000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [pendingApproval, redirecting, router, refreshTick])

  useEffect(() => {
    if (approvalStatus === "active") {
      sessionStorage.removeItem("pendingStudentApproval")
    }
  }, [approvalStatus])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Choose Authentication Method</h1>
            <p className="text-lg text-muted-foreground">Select how you'd like to verify your identity</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/auth/email">Log in with HAU Email</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/register">Create test account</Link>
              </Button>
            </div>
          </div>

          {pendingEnrollment && (
            <Card className="p-5 mb-8 border-amber-500/60 bg-amber-500/10">
              <p className="text-sm text-amber-700">
                Face enrollment is required before you can sign in. Continue enrollment to activate your account.
              </p>
              <div className="mt-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <Link
                    href={`/face-enrollment?${new URLSearchParams({
                      studentNo: pendingEnrollment.studentNo,
                      email: pendingEnrollment.email,
                      name: pendingEnrollment.name,
                    }).toString()}`}
                  >
                    Continue Face Enrollment
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {pendingApproval && approvalStatus !== "active" && (
            <Card className="p-5 mb-8 border-blue-500/60 bg-blue-500/10">
              <p className="text-sm text-blue-700">
                Your registration is pending approval. We will notify you once an admin activates your account.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/auth/email">Log in with HAU Email</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRefreshTick((prev) => prev + 1)}
                  disabled={isCheckingApproval}
                >
                  {isCheckingApproval ? "Checking status..." : "Refresh status"}
                </Button>
              </div>
            </Card>
          )}

          {pendingApproval && approvalStatus === "active" && (
            <Card className="p-5 mb-8 border-emerald-500/60 bg-emerald-500/10">
              <p className="text-sm text-emerald-700">
                Your account is active. Please log in with your HAU email and password to complete face enrollment.
              </p>
              <div className="mt-3 flex justify-center">
                <Button size="sm" asChild>
                  <Link href="/auth/email">Continue to Email Login</Link>
                </Button>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Email Login */}
            <Card
              className={`p-6 transition-all hover:shadow-lg ${
                selectedMethod === "email" ? "border-2 border-primary" : ""
              } ${pendingApproval && approvalStatus !== "active" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              title={
                pendingApproval && approvalStatus !== "active"
                  ? "Email login unlocks face enrollment after approval."
                  : undefined
              }
              onClick={() => {
                if (pendingApproval && approvalStatus !== "active") {
                  return
                }
                setSelectedMethod("email")
              }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">School Email</h3>
                  <p className="text-sm text-muted-foreground">Login with your HAU email and password</p>
                </div>
              </div>
            </Card>

            {/* Facial Recognition */}
            <Card
              className={`p-6 transition-all hover:shadow-lg ${
                selectedMethod === "face" ? "border-2 border-primary" : ""
              } ${forceEmailLogin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              title={forceEmailLogin ? "Complete email login to enable facial sign-in." : undefined}
              onClick={() => {
                if (forceEmailLogin) {
                  return
                }
                setSelectedMethod("face")
              }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Facial Recognition</h3>
                  <p className="text-sm text-muted-foreground">Student number + face verification</p>
                </div>
              </div>
            </Card>

            {/* Combined Method */}
            <Card
              className={`p-6 transition-all hover:shadow-lg ${
                selectedMethod === "combined" ? "border-2 border-primary" : ""
              } ${forceEmailLogin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              title={forceEmailLogin ? "Complete email login to enable combined sign-in." : undefined}
              onClick={() => {
                if (forceEmailLogin) {
                  return
                }
                setSelectedMethod("combined")
              }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Combined</h3>
                  <p className="text-sm text-muted-foreground">Email + Student ID + Face (Most Secure)</p>
                </div>
              </div>
            </Card>
          </div>

          {selectedMethod && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" asChild>
                <Link href={selectedMethod === "email" ? "/auth/email" : selectedMethod === "face" ? "/auth/face-student" : "/auth/combined"}>
                  Continue with{" "}
                  {selectedMethod === "email"
                    ? "Email"
                    : selectedMethod === "face"
                      ? "Facial Recognition"
                      : "Combined Method"}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
