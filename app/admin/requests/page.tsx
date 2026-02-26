"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, CheckCircle2, XCircle, Printer, Receipt, PauseCircle } from "lucide-react"
import { Label } from "@/components/ui/label"

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
  receiptNo?: string | null
  paymentApprovedAt?: string | null
  paymentVerifiedAt?: string | null
  isOnHold?: boolean | null
  holdReason?: string | null
  holdUntil?: string | null
  student: {
    studentNo: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [verificationQueue, setVerificationQueue] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [holdTarget, setHoldTarget] = useState<RequestRow | null>(null)
  const [holdReason, setHoldReason] = useState("")
  const [holdUntil, setHoldUntil] = useState("")
  const [isHolding, setIsHolding] = useState(false)

  const loadRequests = async () => {
    try {
      const url = new URL("/api/admin/requests", window.location.origin)
      if (filter !== "all") {
        url.searchParams.set("status", filter)
      }
      const queueUrl = new URL("/api/admin/requests", window.location.origin)
      queueUrl.searchParams.set("needsVerification", "true")

      const [response, queueResponse] = await Promise.all([fetch(url), fetch(queueUrl)])
      const data = await response.json()
      const queueData = await queueResponse.json()

      if (!response.ok || !data.success) {
        setRequests([])
      } else {
        setRequests(data.requests || [])
      }

      if (!queueResponse.ok || !queueData.success) {
        setVerificationQueue([])
      } else {
        setVerificationQueue(queueData.requests || [])
      }
    } catch (error) {
      console.error("Admin requests load error:", error)
      setRequests([])
      setVerificationQueue([])
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

  const handleHold = async () => {
    if (!holdTarget) {
      return
    }
    setIsHolding(true)
    try {
      const response = await fetch(`/api/admin/requests/${holdTarget.id}`, {
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
      setHoldTarget(null)
      setHoldReason("")
      setHoldUntil("")
      loadRequests()
    } catch (error) {
      console.error("Request hold error:", error)
    } finally {
      setIsHolding(false)
    }
  }

  const handleRelease = async (id: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release" }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      loadRequests()
    } catch (error) {
      console.error("Request release error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleVerifyPayment = async (id: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-payment", reason: "Verified by admin" }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      loadRequests()
    } catch (error) {
      console.error("Payment verification error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkReady = async (id: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-ready" }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return
      }
      loadRequests()
    } catch (error) {
      console.error("Request ready error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDocumentType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return "--"
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handlePrint = (id: string) => {
    window.open(`/dashboard/receipt?requestId=${encodeURIComponent(id)}&mode=admin`, "_blank")
  }

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

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Payment Verification Queue</h3>
            <p className="text-sm text-muted-foreground">
              Requests awaiting manual payment verification.
            </p>
          </div>
          <span className="text-sm text-muted-foreground">{verificationQueue.length} pending</span>
        </div>
        <div className="mt-4 space-y-3">
          {verificationQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending verifications.</p>
          ) : (
            verificationQueue.map((request) => (
              <div key={request.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{formatDocumentType(request.type)}</p>
                  <p className="text-xs text-muted-foreground">Reference: {request.referenceNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.student.firstName} {request.student.lastName} ({request.student.studentNo})
                  </p>
                  <p className="text-xs text-muted-foreground">Payment: {request.paymentMethod || "--"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerifyPayment(request.id)}
                    disabled={isUpdating}
                  >
                    Verify Payment
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setHoldTarget(request)}>
                    Hold
                  </Button>
                </div>
              </div>
            ))
          )}
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
                  {request.isOnHold && (
                    <p className="text-xs text-amber-700">On Hold: {request.holdReason || "No reason provided"}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Receipt: {request.receiptNo || "Pending"} • Approved: {formatDateTime(request.paymentApprovedAt)}
                  </p>
                  {request.paymentMethod && (
                    <p className="text-xs text-muted-foreground">
                      Payment Verified: {formatDateTime(request.paymentVerifiedAt)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Total: {request.totalAmount ? `PHP ${request.totalAmount}.00` : "--"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    disabled={!request.paymentApprovedAt}
                  >
                    <Link href={`/dashboard/receipt?requestId=${encodeURIComponent(request.id)}&mode=admin`}>
                      <Receipt className="w-4 h-4 mr-2" />
                      View Receipt
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrint(request.id)}
                    disabled={!request.paymentApprovedAt}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(request.id, "approve")}
                    disabled={isUpdating || request.status !== "pending"}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  {request.paymentMethod && !request.paymentVerifiedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerifyPayment(request.id)}
                      disabled={isUpdating}
                    >
                      Verify Payment
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkReady(request.id)}
                    disabled={isUpdating || request.status === "ready" || request.status === "rejected"}
                  >
                    Mark Ready
                  </Button>
                  {request.isOnHold ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRelease(request.id)}
                      disabled={isUpdating}
                    >
                      Release Hold
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHoldTarget(request)}
                      disabled={isUpdating}
                    >
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Hold
                    </Button>
                  )}
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

      {holdTarget && (
        <Card className="p-6 mt-6">
          <h4 className="font-semibold text-foreground mb-3">Hold Request</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {formatDocumentType(holdTarget.type)} • {holdTarget.referenceNo}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="holdReason">Reason</Label>
              <Input
                id="holdReason"
                placeholder="Missing payment confirmation"
                value={holdReason}
                onChange={(event) => setHoldReason(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holdUntil">Hold Until (optional)</Label>
              <Input
                id="holdUntil"
                type="date"
                value={holdUntil}
                onChange={(event) => setHoldUntil(event.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleHold} disabled={isHolding}>
              {isHolding ? "Applying..." : "Apply Hold"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setHoldTarget(null)
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
