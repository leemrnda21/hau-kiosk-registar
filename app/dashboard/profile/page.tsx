"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, User, Mail, Phone, MapPin, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    course: "",
    yearLevel: "",
    status: "Active",
    studentNo: "",
  })
  const [hasUser, setHasUser] = useState(true)

  const fullName = useMemo(() => {
    return `${formData.firstName} ${formData.lastName}`.trim()
  }, [formData.firstName, formData.lastName])

  useEffect(() => {
    const userString = sessionStorage.getItem("currentUser")
    const currentUser = userString ? JSON.parse(userString) : null

    if (!currentUser?.studentNumber) {
      setHasUser(false)
      setIsLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/profile?studentNo=${encodeURIComponent(currentUser.studentNumber)}`
        )
        const data = await response.json()
        if (!response.ok || !data.success) {
          setIsLoading(false)
          return
        }
        const student = data.student
        setFormData({
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          email: student.email || "",
          phone: student.phone || "",
          address: student.address || "",
          course: student.course || "",
          yearLevel: student.yearLevel || "",
          status: student.status || "Active",
          studentNo: student.studentNo || "",
        })
      } catch (error) {
        console.error("Profile load error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSave = async () => {
    if (!formData.studentNo) {
      return
    }
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: formData.studentNo,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          course: formData.course,
          yearLevel: formData.yearLevel,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }

      const updated = data.student
      setFormData((prev) => ({
        ...prev,
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
        course: updated.course || "",
        yearLevel: updated.yearLevel || "",
        status: updated.status || prev.status,
      }))

      const userString = sessionStorage.getItem("currentUser")
      const currentUser = userString ? JSON.parse(userString) : null
      if (currentUser) {
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            studentNumber: formData.studentNo,
            fullName: `${updated.firstName} ${updated.lastName}`.trim(),
            email: updated.email,
          })
        )
      }

      setIsEditing(false)
    } catch (error) {
      console.error("Profile save error:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!hasUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
          <Button asChild>
            <Link href="/auth">Go to Login</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <Card className="p-8">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{fullName || "Student"}</h2>
              <p className="text-muted-foreground">Student Number: {formData.studentNo || "--"}</p>
              <p className="text-sm text-muted-foreground">{formData.course || "--"}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearLevel">Year Level</Label>
              <select
                id="yearLevel"
                value={formData.yearLevel}
                onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!isEditing}
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
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-3">Account Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Student Number</p>
              <p className="font-medium text-foreground">{formData.studentNo || "--"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Program</p>
              <p className="font-medium text-foreground">{formData.course || "--"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Year Level</p>
              <p className="font-medium text-foreground">{formData.yearLevel || "--"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">{formData.status || "Active"}</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
