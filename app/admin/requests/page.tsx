"use client"

import { useEffect, useMemo, useState } from "react"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, CheckCircle2, XCircle } from "lucide-react"

type RequestRow = {
  id: string
  type: string
  status: string
  referenceNo: string
  requestedAt: string
  purpose?: string | null
  deliveryMethod?: string | null
  paymentMethod?: string | null
  totalAmount?: number | null
  student: {
    studentNo: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const loadRequests = async () => {
    try {
      const url = new URL("/api/admin/requests", window.location.origin)
      if (filter !== "all") {
        url.searchParams.set("status", filter)
      }
      const response = await fetch(url)
      const data = await response.json()
      if (!response.ok || !data.success) {
        setRequests([])
        return
      }
      setRequests(data.requests || [])
    } catch (error) {
      console.error("Admin requests load error:", error)
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [filter])

  useEffect(() => {
    const eventSource = new EventSource("/api/events")
    const handleUpdate = () => {
      loadRequests()
    }
    eventSource.addEventListener("request-created", handleUpdate)
    eventSource.addEventListener("request-updated", handleUpdate)
    return () => {
      eventSource.close()
    }
  }, [filter])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      loadRequests()
    } catch (error) {
      console.error("Request action error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDocumentType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return requests
    }
    return requests.filter((request) => {
      const studentName = `${request.student.firstName} ${request.student.lastName}`.toLowerCase()
      return (
        request.referenceNo.toLowerCase().includes(term) ||
        request.student.studentNo.toLowerCase().includes(term) ||
        studentName.includes(term)
      )
    })
  }, [requests, search])

  return (
    <AdminShell
      title="Manage Document Requests"
      subtitle="Review, approve, or reject incoming student document requests."
    >
      <Card className="p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex gap-3 items-center">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by reference, student number, or name"
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">No requests found.</p>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">{formatDocumentType(request.type)}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Reference: {request.referenceNo}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.student.firstName} {request.student.lastName} ({request.student.studentNo})
                  </p>
                  <p className="text-xs text-muted-foreground">{request.student.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.deliveryMethod ? `Delivery: ${request.deliveryMethod}` : "Delivery: --"} •
                    {request.paymentMethod ? ` Payment: ${request.paymentMethod}` : " Payment: --"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {request.totalAmount ? `PHP ${request.totalAmount}.00` : "--"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(request.id, "approve")}
                    disabled={isUpdating || request.status !== "pending"}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(request.id, "reject")}
                    disabled={isUpdating || request.status !== "pending"}
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
