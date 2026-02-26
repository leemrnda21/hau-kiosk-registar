"use client"

import { useEffect, useState } from "react"
import AdminShell from "../admin-shell"
import { Card } from "@/components/ui/card"

type AuditLogEntry = {
  id: string
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  reason?: string | null
  createdAt: string
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await fetch("/api/admin/audit-logs?limit=50")
        const data = await response.json()
        if (!response.ok || !data.success) {
          setLogs([])
          return
        }
        setLogs(data.logs || [])
      } catch (error) {
        console.error("Audit log load error:", error)
        setLogs([])
      } finally {
        setIsLoading(false)
      }
    }

    loadLogs()
  }, [])

  const formatDate = (value: string) => {
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

  return (
    <AdminShell
      title="Audit Log"
      subtitle="Track administrative actions for accountability."
    >
      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No audit events found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {log.action} • {log.entityType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.actorEmail || "Unknown admin"} • {log.entityId || "--"}
                  </p>
                  {log.reason && <p className="text-xs text-muted-foreground">Reason: {log.reason}</p>}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
