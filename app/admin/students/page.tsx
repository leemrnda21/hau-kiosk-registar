"use client"

import { useEffect, useMemo, useState } from "react"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, CheckCircle2, XCircle, UserPlus, PauseCircle, Ban } from "lucide-react"

type StudentRow = {
  id: string
  studentNo: string
  firstName: string
  lastName: string
  email: string
  course?: string | null
  yearLevel?: string | null
  status: string
  isOnHold?: boolean | null
  holdReason?: string | null
  holdUntil?: string | null
  isDeactivated?: boolean | null
  deactivatedAt?: string | null
  createdAt: string
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [filter, setFilter] = useState("Pending")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [holdStudent, setHoldStudent] = useState<StudentRow | null>(null)
  const [holdReason, setHoldReason] = useState("")
  const [holdUntil, setHoldUntil] = useState("")
  const [isHolding, setIsHolding] = useState(false)

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
        if (filter === "On Hold") {
          url.searchParams.set("status", "Active")
          url.searchParams.set("onHold", "true")
        } else if (filter === "Deactivated") {
          url.searchParams.set("status", "Active")
          url.searchParams.set("deactivated", "true")
        } else {
          url.searchParams.set("status", filter)
        }
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

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "hold" | "release-hold" | "deactivate" | "reactivate"
  ) => {
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

  const submitHold = async () => {
    if (!holdStudent) {
      return
    }
    setIsHolding(true)
    try {
      const response = await fetch(`/api/admin/students/${holdStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hold",
          reason: holdReason,
          holdUntil: holdUntil || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      setHoldStudent(null)
      setHoldReason("")
      setHoldUntil("")
      loadStudents()
    } catch (error) {
      console.error("Student hold error:", error)
    } finally {
      setIsHolding(false)
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
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Deactivated">Deactivated</SelectItem>
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
                  {student.isOnHold && (
                    <p className="text-xs text-amber-700">On Hold: {student.holdReason || "No reason provided"}</p>
                  )}
                  {student.isDeactivated && (
                    <p className="text-xs text-rose-600">Deactivated</p>
                  )}
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
                  {student.isOnHold ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(student.id, "release-hold")}
                      disabled={isUpdating}
                    >
                      Release Hold
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHoldStudent(student)}
                      disabled={isUpdating}
                    >
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Hold
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAction(student.id, student.isDeactivated ? "reactivate" : "deactivate")
                    }
                    disabled={isUpdating}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {student.isDeactivated ? "Reactivate" : "Deactivate"}
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

      {holdStudent && (
        <Card className="p-6 mt-6">
          <h4 className="font-semibold text-foreground mb-3">Hold Student Account</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {holdStudent.firstName} {holdStudent.lastName} ({holdStudent.studentNo})
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentHoldReason">Reason</Label>
              <Input
                id="studentHoldReason"
                placeholder="Pending document verification"
                value={holdReason}
                onChange={(event) => setHoldReason(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentHoldUntil">Hold Until (optional)</Label>
              <Input
                id="studentHoldUntil"
                type="date"
                value={holdUntil}
                onChange={(event) => setHoldUntil(event.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={submitHold} disabled={isHolding}>
              {isHolding ? "Applying..." : "Apply Hold"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setHoldStudent(null)
                setHoldReason("")
                setHoldUntil("")
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </AdminShell>
  )
}
