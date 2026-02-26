"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Download, Printer, Home, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { demoDocuments } from "@/lib/demo-documents"
import { PrintableDocument } from "@/components/printable-document"

export default function ReceiptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [receiptData, setReceiptData] = useState<any>(null)
  const [kioskPrinting, setKioskPrinting] = useState(false)
  const [documentToPrint, setDocumentToPrint] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const requestId = searchParams.get("requestId")
  const mode = searchParams.get("mode")
  const fallbackPath = mode === "admin" ? "/admin/receipts" : "/dashboard"

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        if (requestId) {
          const userString = sessionStorage.getItem("currentUser")
          const currentUser = userString ? JSON.parse(userString) : null

          const url = new URL("/api/dashboard/requests", window.location.origin)
          if (mode === "admin") {
            url.pathname = "/api/admin/requests"
            url.searchParams.set("requestId", requestId)
          } else if (currentUser?.studentNumber) {
            url.searchParams.set("studentNo", currentUser.studentNumber)
            url.searchParams.set("requestId", requestId)
          }

          if (!url.searchParams.get("requestId") || (!url.searchParams.get("studentNo") && mode !== "admin")) {
            router.push(fallbackPath)
            return
          }

          const response = await fetch(url)
          const data = await response.json()
          if (!response.ok || !data.success || !data.requests?.length) {
            router.push(fallbackPath)
            return
          }

          const requestRecord = data.requests[0]
          setReceiptData({
            referenceNumber: requestRecord.referenceNo,
            paymentReference: requestRecord.paymentReference || "--",
            receiptNumber: requestRecord.receiptNo || "Pending",
            paymentApprovedAt: requestRecord.paymentApprovedAt || null,
            paymentDate: requestRecord.requestedAt,
            status: requestRecord.status === "pending" ? "Pending Payment" : "Paid",
            purpose: requestRecord.purpose || "--",
            deliveryMethod: requestRecord.deliveryMethod || "--",
            paymentMethod: requestRecord.paymentMethod || "--",
            total: requestRecord.totalAmount || 0,
            documents: [
              {
                name: formatDocumentType(requestRecord.type),
                copies: requestRecord.copies,
                price: requestRecord.totalAmount || 0,
              },
            ],
          })
        } else {
          const data = sessionStorage.getItem("receiptData")
          if (!data) {
            router.push(fallbackPath)
            return
          }
          const parsedData = JSON.parse(data)
          setReceiptData(parsedData)
        }
      } catch (error) {
        console.error("Receipt load error:", error)
        router.push(fallbackPath)
      } finally {
        setIsLoading(false)
      }
    }

    loadReceipt()

    const data = sessionStorage.getItem("receiptData")
    if (data) {
      const parsedData = JSON.parse(data)
      if (parsedData.documentToPrint) {
        const doc = demoDocuments.find((d) => d.id === parsedData.documentToPrint)
        if (doc) {
          setDocumentToPrint(doc)
        }
      }
    }

    const shouldPrintKiosk = sessionStorage.getItem("shouldPrintKiosk")
    if (shouldPrintKiosk === "true") {
      setKioskPrinting(true)
      setTimeout(() => {
        window.print()
        sessionStorage.removeItem("shouldPrintKiosk")
        setKioskPrinting(false)
      }, 1000)
    }
  }, [router, requestId, mode])

  const formatDocumentType = (value: string) => {
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const receipt = `
HOLY ANGEL UNIVERSITY
REGISTRAR OFFICE
Official Receipt

Reference Number: ${receiptData?.referenceNumber}
Payment Reference: ${receiptData?.paymentReference}
Date: ${new Date(receiptData?.paymentDate).toLocaleString()}

DOCUMENTS REQUESTED:
${receiptData?.documents.map((doc: any) => `- ${doc.name} (${doc.copies} ${doc.copies === 1 ? "copy" : "copies"}) - PHP ${doc.price * doc.copies}.00`).join("\n")}

Purpose: ${receiptData?.purpose}
Delivery Method: ${receiptData?.deliveryMethod}
Payment Method: ${receiptData?.paymentMethod}

TOTAL AMOUNT: PHP ${receiptData?.total}.00
Status: ${receiptData?.status}

Thank you for your request!
    `

    const blob = new Blob([receipt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${receiptData?.referenceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!receiptData && isLoading) {
    return null
  }

  if (!receiptData) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          ${documentToPrint ? "#document-to-print" : "#receipt-content"},
          ${documentToPrint ? "#document-to-print" : "#receipt-content"} * {
            visibility: visible;
          }
          ${documentToPrint ? "#document-to-print" : "#receipt-content"} {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {documentToPrint && (
        <div id="document-to-print" className="hidden print:block">
          <PrintableDocument document={documentToPrint} />
        </div>
      )}

      <header className="border-b border-border bg-card no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Payment Receipt</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {kioskPrinting && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg no-print">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <p className="text-sm font-medium text-foreground">Printing to Kiosk...</p>
                <p className="text-xs text-muted-foreground">
                  {documentToPrint
                    ? `Printing ${documentToPrint.type}...`
                    : "Your documents are being sent to the printer"}
                </p>
              </div>
            </div>
          </div>
        )}

        {((receiptData.deliveryMethod === "Print at Kiosk" && receiptData.status === "Paid") || documentToPrint) &&
          !kioskPrinting && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg no-print">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {documentToPrint ? "Document Printed Successfully" : "Document Sent to Printer"}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {documentToPrint
                      ? `Your ${documentToPrint.type} has been sent to the kiosk printer. Please collect it from the printer.`
                      : "Your documents have been sent to the kiosk printer. Please collect them from the printer."}
                  </p>
                </div>
              </div>
            </div>
          )}

        <div id="receipt-content">
          <div className="text-center mb-8 no-print">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {receiptData.status === "Paid" ? "Payment Successful!" : "Request Submitted!"}
            </h2>
            <p className="text-muted-foreground">
              {receiptData.status === "Paid"
                ? "Your payment has been processed successfully"
                : "Please pay at the Registrar Office when picking up your documents"}
            </p>
          </div>

          <Card className="p-8">
            <div className="text-center border-b border-border pb-6 mb-6">
              <h3 className="text-2xl font-bold text-primary mb-1">HOLY ANGEL UNIVERSITY</h3>
              <p className="text-sm text-muted-foreground">Registrar Office</p>
              <p className="text-xs text-muted-foreground mt-1">Official Receipt</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Official Receipt No.</p>
                <p className="font-mono font-bold text-foreground">{receiptData.receiptNumber || "Pending"}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
                <p className="font-mono font-bold text-foreground">{receiptData.referenceNumber}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Payment Reference</p>
                <p className="font-mono font-bold text-foreground">{receiptData.paymentReference}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium text-foreground">{new Date(receiptData.paymentDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className={`font-medium ${receiptData.status === "Paid" ? "text-green-600" : "text-amber-600"}`}>
                  {receiptData.status}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Approved By</p>
                <p className="font-medium text-foreground">
                  {receiptData.paymentApprovedAt ? "Registrar Office" : "Pending Approval"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Approved Date</p>
                <p className="font-medium text-foreground">
                  {receiptData.paymentApprovedAt
                    ? new Date(receiptData.paymentApprovedAt).toLocaleString()
                    : "--"}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents Requested
              </h4>
              <div className="space-y-2">
                {receiptData.documents.map((doc: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">
                      {doc.name} ({doc.copies} {doc.copies === 1 ? "copy" : "copies"})
                    </span>
                    <span className="font-medium">PHP {doc.price * doc.copies}.00</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium text-foreground">{receiptData.purpose}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Delivery Method</span>
                <span className="font-medium text-foreground">{receiptData.deliveryMethod}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium text-foreground">{receiptData.paymentMethod}</span>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-primary">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-foreground">TOTAL AMOUNT</span>
                <span className="text-2xl font-bold text-primary">PHP {receiptData.total}.00</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
              <p>This is an official receipt from Holy Angel University Registrar Office.</p>
              <p className="mt-1">Please keep this receipt for your records.</p>
              {receiptData.status === "Pending Payment" && (
                <p className="mt-2 text-amber-600 font-medium">
                  Please present this receipt when paying at the Registrar Office.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 no-print">
          <Button asChild className="flex-1">
            <Link href="/dashboard/track">
              <FileText className="w-4 h-4 mr-2" />
              Track Request
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
