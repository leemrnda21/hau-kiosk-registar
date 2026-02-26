"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, FileText } from "lucide-react"

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
  student: {
    studentNo: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function AdminReceiptsPage() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get("id")
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true)
      try {
        const url = new URL("/api/admin/requests", window.location.origin)
        if (requestId) {
          url.searchParams.set("requestId", requestId)
        }
        const response = await fetch(url)
        const data = await response.json()
        if (!response.ok || !data.success) {
          setRequests([])
          return
        }
        setRequests(data.requests || [])
      } catch (error) {
        console.error("Admin receipts load error:", error)
        setRequests([])
      } finally {
        setIsLoading(false)
      }
    }

    loadRequests()
  }, [requestId])


  const formatDocumentType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")


  const handlePrint = (id: string) => {
    window.open(`/admin/receipt?requestId=${encodeURIComponent(id)}&mode=admin`, "_blank")
  }

  return (
    <AdminShell
      title="Receipts"
      subtitle="View and print per-document receipts after approval."
    >
      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading receipts...</p>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No approved receipts found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests
            .filter((request) => request.status !== "pending" && request.status !== "rejected")
            .map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">{formatDocumentType(request.type)}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Receipt No: {request.receiptNo || "Pending"}</p>
                  <p className="text-sm text-muted-foreground">Reference: {request.referenceNo}</p>
                  <p className="text-xs text-muted-foreground">Approved: {formatDate(request.paymentApprovedAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    Student: {request.student.firstName} {request.student.lastName} ({request.student.studentNo})
                  </p>
                  <p className="text-xs text-muted-foreground">Email: {request.student.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/receipt?requestId=${encodeURIComponent(request.id)}&mode=admin`}>
                      View
                    </Link>
                  </Button>
                  <Button size="sm" onClick={() => handlePrint(request.id)}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
  const formatDate = (value?: string | null) => {
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
