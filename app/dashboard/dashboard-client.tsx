'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Clock, Download, User, LogOut, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type CurrentUser = {
  studentNumber: string
  fullName: string
  email: string
} | null

type DashboardRequest = {
  id: string
  type: string
  status: "pending" | "processing" | "submitted" | "ready"
  referenceNo: string
  requestedAt: string
}

type DashboardStats = {
  pending: number
  ready: number
  submitted: number
  total: number
}

export default function DashboardClient() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<DashboardRequest[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    ready: 0,
    submitted: 0,
    total: 0,
  })
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  useEffect(() => {
    // Get user from sessionStorage
    const userString = sessionStorage.getItem('currentUser')
    if (userString) {
      const user = JSON.parse(userString)
      setCurrentUser(user)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const loadRequests = async () => {
      setIsLoadingRequests(true)
      try {
        const response = await fetch(
          `/api/dashboard/requests?studentNo=${encodeURIComponent(currentUser.studentNumber)}`
        )
        const data = await response.json()

        if (!response.ok || !data.success) {
          setRequests([])
          setStats({ pending: 0, ready: 0, submitted: 0, total: 0 })
          return
        }

        setRequests(data.requests || [])
        setStats({
          pending: data.stats?.pending ?? 0,
          ready: data.stats?.ready ?? 0,
          submitted: data.stats?.submitted ?? 0,
          total: data.stats?.total ?? 0,
        })
      } catch (error) {
        console.error("Failed to load requests:", error)
        setRequests([])
        setStats({ pending: 0, ready: 0, submitted: 0, total: 0 })
      } finally {
        setIsLoadingRequests(false)
      }
    }

    loadRequests()
  }, [currentUser])

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Please log in to access the dashboard</p>
          <Button asChild>
            <Link href="/auth">Go to Login</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const statusPillClass = {
    pending: "bg-slate-500/10 text-slate-700",
    processing: "bg-yellow-500/10 text-yellow-700",
    submitted: "bg-blue-500/10 text-blue-700",
    ready: "bg-green-500/10 text-green-700",
  } as const

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

  const formatDocumentType = (value: string) => {
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-circle.png" alt="HAU seal" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h1 className="font-bold text-foreground">Holy Angel University</h1>
                <p className="text-xs text-muted-foreground">Registrar Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back, {currentUser.fullName}</h2>
          <p className="text-muted-foreground">Student Number: {currentUser.studentNumber}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Requests</p>
                <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-primary" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ready to Download</p>
                <p className="text-3xl font-bold text-foreground">{stats.ready}</p>
              </div>
              <Download className="w-10 h-10 text-green-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Requests</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild className="h-auto py-6 flex-col gap-2 bg-transparent" variant="outline">
              <Link href="/dashboard/request">
                <Plus className="w-6 h-6" />
                <span>Request New Document</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-6 flex-col gap-2 bg-transparent" variant="outline">
              <Link href="/dashboard/track">
                <Search className="w-6 h-6" />
                <span>Track Requests</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-6 flex-col gap-2 bg-transparent" variant="outline">
              <Link href="/dashboard/downloads">
                <Download className="w-6 h-6" />
                <span>Download Documents</span>
              </Link>
            </Button>
            <Button asChild className="h-auto py-6 flex-col gap-2 bg-transparent" variant="outline">
              <Link href="/dashboard/profile">
                <User className="w-6 h-6" />
                <span>Update Information</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Recent Requests</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/track">View All</Link>
            </Button>
          </div>
          <div className="space-y-4">
            {isLoadingRequests ? (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Loading recent requests...</p>
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              </Card>
            ) : requests.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">No recent requests yet.</p>
              </Card>
            ) : (
              requests.map((request) => (
                <Card className="p-6" key={request.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-foreground">
                          {formatDocumentType(request.type)}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Reference: {request.referenceNo}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Requested: {formatDate(request.requestedAt)}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusPillClass[request.status]
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    {request.status === "ready" ? (
                      <Button size="sm">Download</Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        Track
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
