"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type PendingRequestData = {
  studentNo?: string
  documents: Array<{
    id: string
    name: string
    copies: number
    price: number
  }>
  purpose?: string
  deliveryMethod?: string
  deliveryDetails?: {
    pickupDate?: string
    pickupTime?: string
    address?: string
  }
  paymentMethod?: string
  total: number
}

export default function PaymentPage() {
  const router = useRouter()
  const [requestData, setRequestData] = useState<PendingRequestData | null>(null)
  const [processing, setProcessing] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
  const [paypalReady, setPaypalReady] = useState(false)
  const [paypalRetries, setPaypalRetries] = useState(0)

  useEffect(() => {
    const data = sessionStorage.getItem("pendingRequest")
    if (!data) {
      router.push("/dashboard/request")
      return
    }
    setRequestData(JSON.parse(data))
  }, [router])

  useEffect(() => {
    const loadPayPalSdk = () => {
      try {
        setPaymentError(null)
        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
        if (!clientId) {
          throw new Error("PayPal client id is missing.")
        }

        if (document.getElementById("paypal-sdk")) {
          setSdkReady(true)
          setPaypalReady(true)
          setPaypalRetries(0)
          return
        }

        const script = document.createElement("script")
        script.id = "paypal-sdk"
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=PHP`
        script.async = true
        script.onload = () => {
          setSdkReady(true)
          setPaypalReady(true)
          setPaypalRetries(0)
        }
        script.onerror = () => handlePaymentError("Failed to load PayPal.")
        document.body.appendChild(script)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load PayPal."
        handlePaymentError(message)
      }
    }

    loadPayPalSdk()
  }, [])

  useEffect(() => {
    if (!sdkReady || !requestData) {
      return
    }

    const renderButtons = async () => {
      try {
        const paypal = (window as any).paypal
        if (!paypal) {
          if (!paypalReady || paypalRetries < 6) {
            setTimeout(() => setPaypalRetries((count) => count + 1), 300)
            return
          }
          handlePaymentError("PayPal is unavailable. Check your network, ad-blockers, and the client id.")
          return
        }

        const buttonsContainer = document.getElementById("paypal-buttons")
        if (buttonsContainer?.childNodes.length) {
          return
        }

        paypal
          .Buttons({
            createOrder: async () => {
              setPaymentError(null)
              setProcessing(true)
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: requestData.total,
                  currency: "PHP",
                }),
              })

              const data = await response.json()

              if (!response.ok || !data.success) {
                const issue = data.issue || "paypal_create_failed"
                setProcessing(false)
                throw new Error(issue)
              }

              setPaypalOrderId(data.orderId)
              setProcessing(false)
              return data.orderId
            },
            onApprove: async (details: any) => {
              try {
                setProcessing(true)
                const response = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: details.orderID,
                  }),
                })

                const data = await response.json()

                if (!response.ok || !data.success) {
                  const issue = data.issue || "paypal_capture_failed"
                  throw new Error(issue)
                }

                const reference = data.captureId || paypalOrderId || `PAY-${Date.now()}`
                await finalizeRequest(reference)
              } catch (error) {
                const rawMessage = error instanceof Error ? error.message : "Payment failed."
                const message = rawMessage === "INSTRUMENT_DECLINED"
                  ? "PayPal declined the payment instrument. Please use a different sandbox account."
                  : rawMessage === "PAYER_CANNOT_PAY" || rawMessage === "PAYER_ACTION_REQUIRED"
                    ? "PayPal requires a different account or additional action. Please check your sandbox account."
                    : rawMessage === "INVALID_ACCOUNT_STATUS"
                      ? "PayPal account is not eligible for this payment. Please use a valid sandbox buyer."
                      : rawMessage
                handlePaymentError(message)
              }
            },
            onError: (err: any) => {
              const message = err?.message || "PayPal rejected the payment. Please check your sandbox account and try again."
              handlePaymentError(message)
            },
            onCancel: () => {
              setProcessing(false)
              handlePaymentError("Payment cancelled.")
            },
          })
          .render("#paypal-buttons")
          .catch(() => {
            handlePaymentError("PayPal failed to render. Please reload the page.")
          })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Payment failed."
        handlePaymentError(message)
      }
    }

    renderButtons()
  }, [sdkReady, requestData, paypalOrderId, paypalReady, paypalRetries])

  const handlePaymentError = (message: string) => {
    setPaymentError(message)
    setProcessing(false)
  }

  const finalizeRequest = async (paymentReference: string) => {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentNo: requestData?.studentNo,
        documents: requestData?.documents ?? [],
        purpose: requestData?.purpose,
        deliveryMethod: requestData?.deliveryMethod,
        paymentMethod: "PayPal",
        paymentReference,
        total: requestData?.total,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to submit request.")
    }

    const refNumber = data.requests?.[0]?.referenceNo || `REQ-${Date.now()}`
    const paymentRef = data.requests?.[0]?.paymentReference || paymentReference || `PAY-${Date.now()}`

    const receiptData = {
      ...requestData,
      referenceNumber: refNumber,
      paymentReference: paymentRef,
      paymentMethod: "PayPal",
      paymentDate: new Date().toISOString(),
      status: "Paid",
    }

    sessionStorage.setItem("receiptData", JSON.stringify(receiptData))
    sessionStorage.removeItem("pendingRequest")

    if (requestData?.deliveryMethod === "Print at Kiosk") {
      sessionStorage.setItem("shouldPrintKiosk", "true")
    }

    setProcessing(false)
    router.push(`/dashboard/track?ref=${encodeURIComponent(refNumber)}&new=1`)
  }

  if (!requestData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/request">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Request
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Payment</h1>
        <p className="text-muted-foreground mb-8">Complete your payment to process the request</p>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Payment Method</h2>

              {requestData?.deliveryMethod === "Print at Kiosk" && (
                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex gap-3">
                    <Printer className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Print at Kiosk</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your documents will be printed immediately after payment is confirmed. Please ensure the kiosk
                        printer is ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Pay securely with PayPal. Use your sandbox account to test invalid logins or payment failures.
                  </p>
                </div>

                {paymentError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {paymentError}
                  </div>
                )}

                {!sdkReady && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading PayPal...
                  </div>
                )}
                <div id="paypal-buttons" className="min-h-[44px]" />
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h3 className="font-bold text-foreground mb-4">Order Summary</h3>
              <div className="space-y-3">
                {requestData.documents.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {doc.name} x{doc.copies}
                    </span>
                    <span className="font-medium">PHP {doc.price * doc.copies}.00</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">PHP {requestData.total}.00</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="font-medium text-right">{requestData.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery:</span>
                  <span className="font-medium text-right">{requestData.deliveryMethod}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
