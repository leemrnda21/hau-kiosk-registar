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
  subjectName?: string | null
  studentNo?: string | null
  studentEmail?: string | null
  referenceNo?: string | null
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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">By</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">
                        {log.subjectName || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.studentNo || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.actorEmail || "Unknown admin"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">
                        {log.entityType}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.referenceNo || log.entityId || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  )
}
