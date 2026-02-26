"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer, Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type RequestItem = {
  id: string
  referenceNo: string
  type: string
  status: string
  requestedAt: string
  completedAt?: string | null
  deliveryMethod?: string | null
}

export default function PrintPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId")
  const auto = searchParams.get("auto")
  const [request, setRequest] = useState<RequestItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [printStatus, setPrintStatus] = useState<"idle" | "ready" | "printing" | "blocked">("idle")
  const [emailRecipient, setEmailRecipient] = useState("")
  const [emailStatus, setEmailStatus] = useState("")
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [pdfLoaded, setPdfLoaded] = useState(false)

  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null
    const userString = sessionStorage.getItem("currentUser")
    return userString ? JSON.parse(userString) : null
  }, [])

  useEffect(() => {
    const loadRequest = async () => {
      if (!requestId || !currentUser?.studentNumber) {
        setLoading(false)
        return
      }
      try {
        const url = new URL("/api/dashboard/requests", window.location.origin)
        url.searchParams.set("studentNo", currentUser.studentNumber)
        url.searchParams.set("requestId", requestId)
        const response = await fetch(url)
        const data = await response.json()
        if (!response.ok || !data.success || !data.requests?.length) {
          setRequest(null)
          return
        }
        setRequest(data.requests[0])
      } catch (error) {
        console.error("Print request load error:", error)
        setRequest(null)
      } finally {
        setLoading(false)
      }
    }

    loadRequest()
  }, [requestId, currentUser])

  useEffect(() => {
    if (!request || request.status !== "ready") {
      return
    }
    setPrintStatus("ready")
    if (auto === "1" && pdfLoaded) {
      setPrintStatus("printing")
      const timeout = setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.print()
        } catch (error) {
          console.error("Print error:", error)
          setPrintStatus("blocked")
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [request, auto, pdfLoaded])

  useEffect(() => {
    const handleAfterPrint = () => {
      if (printStatus === "printing") {
        setPrintStatus("ready")
      }
    }
    window.addEventListener("afterprint", handleAfterPrint)
    return () => window.removeEventListener("afterprint", handleAfterPrint)
  }, [printStatus])

  const formatDocumentType = (value: string) => {
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const handleSendEmail = async () => {
    if (!request || !currentUser?.studentNumber) {
      return
    }
    const recipient = emailRecipient.trim()
    if (!recipient) {
      setEmailStatus("✗ Please enter a recipient email.")
      return
    }
    setEmailStatus("Sending document to email...")
    try {
      const response = await fetch(`/api/documents/${request.id}/email`, {
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
    }
  }

  if (loading) {
    return null
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Request not found.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/track">Back to Track</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const isReady = request.status === "ready"
  const allowsPrint =
    request.deliveryMethod === "Pick-up at Registrar" || request.deliveryMethod === "Pick-up + Digital Copy"

  return (
    <div className="min-h-screen bg-background">
      {isReady && allowsPrint && (
        <iframe
          ref={iframeRef}
          title="Document Print"
          src={`/api/documents/${request.id}/download`}
          className="absolute -left-[9999px] top-0 w-[800px] h-[1000px]"
          onLoad={() => setPdfLoaded(true)}
        />
      )}

      <div>
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Print Document</h1>
            <p className="text-muted-foreground">
              {formatDocumentType(request.type)} • {request.referenceNo}
            </p>
          </div>

          {!isReady && (
            <Card className="p-6 mb-6 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Printing is not available yet.</p>
                  <p className="text-sm text-amber-800">This document must be marked ready by the registrar.</p>
                </div>
              </div>
            </Card>
          )}

          {emailStatus && (
            <div className={`mb-6 p-4 rounded-lg border ${emailStatus.includes("✓") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={emailStatus.includes("✓") ? "text-green-700" : "text-red-700"}>{emailStatus}</p>
            </div>
          )}

          <Card className="p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium text-foreground">{request.status}</p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Recipient email"
                    value={emailRecipient}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setEmailRecipient(event.target.value)
                    }
                    className="w-full md:w-72"
                    disabled={!isReady}
                  />
                  <Button variant="outline" onClick={handleSendEmail} disabled={!isReady}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    if (!iframeRef.current?.contentWindow) {
                      setPrintStatus("blocked")
                      return
                    }
                    setPrintStatus("printing")
                    iframeRef.current.contentWindow.print()
                  }}
                  disabled={!isReady || !pdfLoaded || !allowsPrint}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {printStatus === "printing" ? "Printing..." : "Print Now"}
                </Button>
              </div>
              {isReady && !allowsPrint && (
                <p className="text-sm text-amber-700">
                  This request is set for digital copy only. Printing is not available.
                </p>
              )}
              {printStatus === "blocked" && (
                <p className="text-sm text-amber-700">
                  Auto-print was blocked. Please tap Print Now.
                </p>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
