"use client"

import { useEffect, useMemo, useState } from "react"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, CheckCircle2, XCircle, UserPlus } from "lucide-react"

type StudentRow = {
  id: string
  studentNo: string
  firstName: string
  lastName: string
  email: string
  course?: string | null
  yearLevel?: string | null
  status: string
  createdAt: string
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [filter, setFilter] = useState("Pending")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const [adminEmail, setAdminEmail] = useState("")
  const [adminFirstName, setAdminFirstName] = useState("")
  const [adminLastName, setAdminLastName] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminRole, setAdminRole] = useState("admin")
  const [adminStatus, setAdminStatus] = useState("")

  const loadStudents = async () => {
    try {
      const url = new URL("/api/admin/students", window.location.origin)
      if (filter !== "all") {
        url.searchParams.set("status", filter)
      }
      const response = await fetch(url)
      const data = await response.json()
      if (!response.ok || !data.success) {
        setStudents([])
        return
      }
      setStudents(data.students || [])
    } catch (error) {
      console.error("Admin students load error:", error)
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [filter])

  useEffect(() => {
    const eventSource = new EventSource("/api/events")
    const handleUpdate = () => {
      loadStudents()
    }
    eventSource.addEventListener("student-created", handleUpdate)
    eventSource.addEventListener("student-updated", handleUpdate)
    return () => {
      eventSource.close()
    }
  }, [filter])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      loadStudents()
    } catch (error) {
      console.error("Student action error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAdminCreate = async () => {
    setAdminStatus("")
    if (!adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      setAdminStatus("Please fill in all admin fields.")
      return
    }
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          password: adminPassword,
          role: adminRole,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setAdminStatus(data.message || "Failed to create admin.")
        return
      }
      setAdminStatus("Admin created successfully.")
      setAdminEmail("")
      setAdminFirstName("")
      setAdminLastName("")
      setAdminPassword("")
      setAdminRole("admin")
    } catch (error) {
      console.error("Admin create error:", error)
      setAdminStatus("Failed to create admin.")
    }
  }

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return students
    }
    return students.filter((student) => {
      const name = `${student.firstName} ${student.lastName}`.toLowerCase()
      return (
        student.studentNo.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        name.includes(term)
      )
    })
  }, [students, search])

  return (
    <AdminShell
      title="Manage Student Accounts"
      subtitle="Approve student registrations and create additional admin access."
    >
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Create Admin Account</h3>
        </div>
        {adminStatus && (
          <p className="text-sm text-muted-foreground mb-3">{adminStatus}</p>
        )}
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input id="adminEmail" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminFirstName">First Name</Label>
            <Input id="adminFirstName" value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminLastName">Last Name</Label>
            <Input id="adminLastName" value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminRole">Role</Label>
            <Select value={adminRole} onValueChange={setAdminRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleAdminCreate}>Create Admin</Button>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex gap-3 items-center">
            <Users className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by student number, name, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full lg:w-96"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Loading students...</p>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">No students found.</p>
          </Card>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{student.studentNo}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.course || ""} {student.yearLevel ? `• ${student.yearLevel}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(student.id, "approve")}
                    disabled={isUpdating || student.status !== "Pending"}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(student.id, "reject")}
                    disabled={isUpdating || student.status !== "Pending"}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </AdminShell>
  )
}
