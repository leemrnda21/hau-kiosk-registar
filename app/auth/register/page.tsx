"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, User, IdCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RegisterResponse = {
  success: boolean
  message: string
  student?: {
    id: string
    studentNo: string
    firstName: string
    lastName: string
    email: string
    status?: string
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [studentNo, setStudentNo] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [course, setCourse] = useState("")
  const [yearLevel, setYearLevel] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo,
          firstName,
          lastName,
          course,
          yearLevel,
          email,
          password,
        }),
      })

      const data = (await response.json()) as RegisterResponse
      if (!response.ok || !data.success || !data.student) {
        setError(data.message || "Registration failed.")
        setIsLoading(false)
        return
      }

      const fullName = `${data.student.firstName} ${data.student.lastName}`
      if ((data.student.status || "Pending").toLowerCase() !== "active") {
        sessionStorage.setItem(
          "pendingStudentApproval",
          JSON.stringify({
            studentNo: data.student.studentNo,
            email: data.student.email,
            name: fullName,
          })
        )
        router.push("/auth?pending=approval")
        return
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError("Registration failed. Please try again.")
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Create Test Account</h1>
            <p className="text-sm text-muted-foreground">
              Register a student account and continue to face enrollment
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="studentNo">Student Number</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="studentNo"
                  type="text"
                  placeholder="2024-123456"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                type="text"
                placeholder="BS Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearLevel">Year Level</Label>
              <select
                id="yearLevel"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">School Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="student@hau.edu.ph"
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register & Enroll Face"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
