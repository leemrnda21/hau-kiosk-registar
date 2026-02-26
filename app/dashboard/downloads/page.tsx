"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, FileText, Calendar, ExternalLink, Printer, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { DocumentStatus } from "@/lib/demo-documents"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DownloadsPage() {
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string; fullName: string; studentNumber: string } | null>(null)
  const [emailStatus, setEmailStatus] = useState<string>("")
  const [emailingDoc, setEmailingDoc] = useState<string | null>(null)
  const [emailRecipient, setEmailRecipient] = useState("")
  const [documents, setDocuments] = useState<
    Array<{
      id: string
      referenceNo: string
      type: string
      status: DocumentStatus
      requestedAt: string
      completedAt?: string | null
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  // Get user info from sessionStorage
  useEffect(() => {
    const userString = sessionStorage.getItem('currentUser')
    if (userString) {
      const user = JSON.parse(userString)
      setCurrentUser(user)
    }
  }, [])

  useEffect(() => {
    if (!currentUser?.studentNumber) {
      setIsLoading(false)
      return
    }

    const loadDocuments = async () => {
      try {
        const response = await fetch(
          `/api/documents?studentNo=${encodeURIComponent(currentUser.studentNumber)}`
        )
        const data = await response.json()
        if (!response.ok || !data.success) {
          setDocuments([])
          return
        }
        setDocuments(data.requests || [])
      } catch (error) {
        console.error("Failed to load documents:", error)
        setDocuments([])
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser?.studentNumber) {
      return
    }

    const eventSource = new EventSource("/api/events")
    const handleUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.studentNo && payload.studentNo !== currentUser.studentNumber) {
          return
        }
        fetch(`/api/documents?studentNo=${encodeURIComponent(currentUser.studentNumber)}`)
          .then((response) => response.json())
          .then((data) => {
            if (data?.success) {
              setDocuments(data.requests || [])
            }
          })
      } catch (error) {
        console.error("Event update parse error:", error)
      }
    }

    eventSource.addEventListener("request-updated", handleUpdate)
    eventSource.addEventListener("request-created", handleUpdate)

    return () => {
      eventSource.close()
    }
  }, [currentUser])

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter
      const matchesType =
        typeFilter === "all" ||
        doc.type === typeFilter ||
        doc.type.replace(/_/g, " ").toLowerCase().includes(typeFilter.toLowerCase())
      return matchesStatus && matchesType
    })
  }, [documents, statusFilter, typeFilter])

  const selectedDoc = previewDoc ? documents.find((d) => d.id === previewDoc) : null

  const formatDocumentType = (value: string) =>
    value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

  const handleSendEmail = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc || !currentUser?.studentNumber) {
      return
    }
    const recipient = emailRecipient.trim()
    if (!recipient) {
      setEmailStatus("✗ Please enter a recipient email.")
      return
    }

    setEmailingDoc(docId)
    setEmailStatus("Sending document to email...")
    try {
      const response = await fetch(`/api/documents/${docId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          studentNo: currentUser.studentNumber,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send email")
      }
      setEmailStatus(`✓ ${data.message || "Email sent."}`)
      setTimeout(() => setEmailStatus(""), 5000)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email"
      setEmailStatus(`✗ ${message}`)
    } finally {
      setEmailingDoc(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {selectedDoc && previewDoc && (
        <div className="print:block hidden">
          <iframe
            title="Document Preview"
            src={`/api/documents/${selectedDoc.id}/download`}
            className="w-full h-[1000px]"
          />
        </div>
      )}

      <div className={previewDoc ? "print:hidden" : ""}>
        <header className="border-b border-border bg-card no-print">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Email Status Message */}
          {emailStatus && (
            <div className={`mb-6 p-4 rounded-lg border ${emailStatus.includes('✓') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={emailStatus.includes('✓') ? 'text-green-700' : 'text-red-700'}>{emailStatus}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Ready Documents</h1>

            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "all")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Transcript of Records">Transcript</SelectItem>
                  <SelectItem value="Certificate of Good Moral Character">Good Moral</SelectItem>
                  <SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Certificate of Enrollment">Enrollment</SelectItem>
                  <SelectItem value="Certificate of Grades">Grades</SelectItem>
                  <SelectItem value="Honorable Dismissal">Honorable Dismissal</SelectItem>
                  <SelectItem value="Certificate of Transfer Credential">Transfer</SelectItem>
                  <SelectItem value="Certificate of Graduation">Graduation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Loading documents</h3>
              <p className="text-muted-foreground">Fetching your requests...</p>
            </Card>
          ) : filteredDocuments.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No ready documents</h3>
              <p className="text-muted-foreground mb-6">Track requests while the registrar processes them</p>
              <Button asChild>
                <Link href="/dashboard/request">Request New Document</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-6 h-6 text-primary" />
                        <div>
                          <h3 className="font-bold text-foreground text-lg">{formatDocumentType(doc.type)}</h3>
                          <p className="text-sm text-muted-foreground">Reference: {doc.referenceNo}</p>
                          {currentUser && (
                            <p className="text-sm text-muted-foreground">
                              {currentUser.fullName} - {currentUser.studentNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Requested: {new Date(doc.requestedAt).toLocaleDateString()}</span>
                        </div>
                        {doc.completedAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Completed: {new Date(doc.completedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            doc.status === "ready"
                              ? "bg-green-500/10 text-green-700"
                              : doc.status === "processing"
                                ? "bg-blue-500/10 text-blue-700"
                                : doc.status === "rejected"
                                  ? "bg-rose-500/10 text-rose-700"
                                  : "bg-yellow-500/10 text-yellow-700"
                          }`}
                        >
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 no-print">
                      {doc.status === "ready" && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Recipient email"
                            value={emailRecipient}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              setEmailRecipient(event.target.value)
                            }
                            className="w-64"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail(doc.id)}
                            disabled={emailingDoc === doc.id}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            {emailingDoc === doc.id ? "Sending..." : "Send Email"}
                          </Button>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewDoc(doc.id)}
                        disabled={doc.status !== "ready"}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      {doc.status === "ready" && (
                        <>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/print?requestId=${encodeURIComponent(doc.id)}&auto=1`}>
                              <Printer className="w-4 h-4 mr-2" />
                              Print (PHP 50)
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-6 mt-8 bg-yellow-500/10 border-yellow-500/20 no-print">
            <h3 className="font-semibold text-foreground mb-2">Important Notice</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Printing documents at the kiosk costs PHP 50.00 per document</li>
              <li>• Payment is required before printing</li>
              <li>• Email delivery is available only after approval</li>
              <li>• Documents are watermarked with your student number</li>
              <li>• Digital copies are officially signed by the registrar</li>
              <li>• Keep your documents secure and do not share email copies</li>
            </ul>
          </Card>
        </main>
      </div>

      {selectedDoc && previewDoc && selectedDoc.status === "ready" && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="font-semibold text-lg">Document Preview</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/print?requestId=${encodeURIComponent(selectedDoc.id)}&auto=1`}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print (PHP 50)
                  </Link>
                </Button>
                <Button size="sm" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
            <iframe
              title="Document Preview"
              src={`/api/documents/${selectedDoc.id}/download`}
              className="w-full h-[70vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
