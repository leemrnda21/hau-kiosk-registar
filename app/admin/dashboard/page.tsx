"use client"

import { useEffect, useState } from "react"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { FileText, Users, Clock, CheckCircle2 } from "lucide-react"

type DashboardStats = {
  pendingRequests: number
  approvedToday: number
  rejectedToday: number
  pendingStudents: number
}

type RecentRequest = {
  id: string
  type: string
  status: string
  referenceNo: string
  requestedAt: string
  student: {
    studentNo: string
    firstName: string
    lastName: string
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    approvedToday: 0,
    rejectedToday: 0,
    pendingStudents: 0,
  })
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/admin/overview")
        const data = await response.json()
        if (!response.ok || !data.success) {
          return
        }
        setStats(data.stats)
        setRecentRequests(data.recentRequests || [])
      } catch (error) {
        console.error("Admin dashboard load error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const formatDocumentType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Monitor requests, approvals, and student onboarding in real time."
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Requests</p>
              <p className="text-3xl font-bold text-foreground">
                {loading ? "--" : stats.pendingRequests}
              </p>
            </div>
            <Clock className="w-10 h-10 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Approved Today</p>
              <p className="text-3xl font-bold text-foreground">
                {loading ? "--" : stats.approvedToday}
              </p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Rejected Today</p>
              <p className="text-3xl font-bold text-foreground">
                {loading ? "--" : stats.rejectedToday}
              </p>
            </div>
            <FileText className="w-10 h-10 text-rose-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Students</p>
              <p className="text-3xl font-bold text-foreground">
                {loading ? "--" : stats.pendingStudents}
              </p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">Recent Document Requests</h3>
        <div className="space-y-4">
          {loading ? (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Loading recent requests...</p>
            </Card>
          ) : recentRequests.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">No recent requests yet.</p>
            </Card>
          ) : (
            recentRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatDocumentType(request.type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.student.firstName} {request.student.lastName} ({request.student.studentNo})
                    </p>
                    <p className="text-xs text-muted-foreground">Reference: {request.referenceNo}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(request.requestedAt)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  )
}
