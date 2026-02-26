"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, Loader2, AlertCircle, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

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
  const [printing, setPrinting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "gcash" | "paymaya" | "cash">("card")

  // Card details
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")

  // E-wallet details
  const [mobileNumber, setMobileNumber] = useState("")

  useEffect(() => {
    const data = sessionStorage.getItem("pendingRequest")
    if (!data) {
      router.push("/dashboard/request")
      return
    }
    setRequestData(JSON.parse(data))
  }, [router])

  const handlePayment = async () => {
    setProcessing(true)
    try {
      const paymentLabel =
        paymentMethod === "card"
          ? "Credit/Debit Card"
          : paymentMethod === "gcash"
            ? "GCash"
            : paymentMethod === "paymaya"
              ? "PayMaya"
              : "Cash on Pickup"

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: requestData?.studentNo,
          documents: requestData?.documents ?? [],
          purpose: requestData?.purpose,
          deliveryMethod: requestData?.deliveryMethod,
          paymentMethod: paymentLabel,
          total: requestData?.total,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit request.")
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))

      const refNumber = data.requests?.[0]?.referenceNo || `REQ-${Date.now()}`
      const paymentRef = data.requests?.[0]?.paymentReference || `PAY-${Date.now()}`

      const receiptData = {
        ...requestData,
        referenceNumber: refNumber,
        paymentReference: paymentRef,
        paymentMethod: paymentLabel,
        paymentDate: new Date().toISOString(),
        status: paymentMethod === "cash" ? "Pending Payment" : "Paid",
      }

      sessionStorage.setItem("receiptData", JSON.stringify(receiptData))
      sessionStorage.removeItem("pendingRequest")

      if (requestData?.deliveryMethod === "Print at Kiosk" && paymentMethod !== "cash") {
        sessionStorage.setItem("shouldPrintKiosk", "true")
      }

      router.push(
        `/dashboard/track?ref=${encodeURIComponent(refNumber)}&new=1`
      )
    } catch (error) {
      console.error("Payment submit error:", error)
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 500)
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

              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 border rounded-lg transition-colors ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Card</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("gcash")}
                  className={`p-4 border rounded-lg transition-colors ${
                    paymentMethod === "gcash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-6 h-6 mx-auto mb-2 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    G
                  </div>
                  <p className="text-sm font-medium">GCash</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("paymaya")}
                  className={`p-4 border rounded-lg transition-colors ${
                    paymentMethod === "paymaya"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-6 h-6 mx-auto mb-2 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    PM
                  </div>
                  <p className="text-sm font-medium">PayMaya</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 border rounded-lg transition-colors ${
                    paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="w-6 h-6 mx-auto mb-2 text-2xl">💵</div>
                  <p className="text-sm font-medium">Cash</p>
                </button>
              </div>

              {/* Card Payment Form */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="JUAN DELA CRUZ"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* E-Wallet Payment Form */}
              {(paymentMethod === "gcash" || paymentMethod === "paymaya") && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {paymentMethod === "gcash" ? "GCash" : "PayMaya"} Payment
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          You will be redirected to {paymentMethod === "gcash" ? "GCash" : "PayMaya"} to complete your
                          payment
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      placeholder="09XX XXX XXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      maxLength={11}
                    />
                  </div>
                </div>
              )}

              {/* Cash Payment Info */}
              {paymentMethod === "cash" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Cash Payment on Pickup</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Please bring the exact amount when picking up your documents at the Registrar Office. Your
                        request will be processed once payment is confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handlePayment} disabled={processing} className="w-full mt-6" size="lg">
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>{paymentMethod === "cash" ? "Confirm Request" : `Pay PHP ${requestData.total}.00`}</>
                )}
              </Button>
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
