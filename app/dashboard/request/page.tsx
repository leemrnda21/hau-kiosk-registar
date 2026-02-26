"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

type Step = "select" | "details" | "delivery" | "payment" | "confirm"

const documents = [
  { id: "tor-official", name: "Transcript of Records (Official)", price: 150 },
  { id: "tor-unofficial", name: "Transcript of Records (Unofficial)", price: 50 },
  { id: "cog", name: "Certificate of Grades", price: 50 },
  { id: "coe", name: "Certificate of Enrollment", price: 50 },
  { id: "gmc", name: "Certificate of Good Moral Character", price: 50 },
  { id: "diploma", name: "Diploma (Authenticated Copy)", price: 200 },
  { id: "hd", name: "Honorable Dismissal", price: 100 },
  { id: "cue", name: "Certificate of Units Earned", price: 50 },
]

const purposes = ["Employment", "Further Studies", "Scholarship Application", "Personal Records", "Other"]

const steps = [
  { id: "select", label: "Select" },
  { id: "details", label: "Details" },
  { id: "delivery", label: "Release Option" },
  { id: "payment", label: "Payment" },
  { id: "confirm", label: "Confirm" },
]

const deliveryMethods = [
  { id: "pickup", name: "Pick-up at Registrar", description: "Available after payment once approved by the registrar" },
  { id: "digital", name: "Digital Copy", description: "Available after payment once approved by the registrar" },
]

export default function RequestPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("select")
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [copies, setCopies] = useState<Record<string, number>>({})
  const [purpose, setPurpose] = useState("")
  const [customPurpose, setCustomPurpose] = useState("")
  const [deliveryMethod, setDeliveryMethod] = useState("")
  const [deliveryDetails, setDeliveryDetails] = useState({
    pickupDate: "",
    pickupTime: "",
    address: "",
  })
  const [paymentMethod, setPaymentMethod] = useState("")

  const toggleDocument = (docId: string) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter((id) => id !== docId))
      const newCopies = { ...copies }
      delete newCopies[docId]
      setCopies(newCopies)
    } else {
      setSelectedDocs([...selectedDocs, docId])
      setCopies({ ...copies, [docId]: 1 })
    }
  }

  const updateCopies = (docId: string, count: number) => {
    if (count >= 1 && count <= 10) {
      setCopies({ ...copies, [docId]: count })
    }
  }

  const calculateTotal = () => {
    return selectedDocs.reduce((total, docId) => {
      const doc = documents.find((d) => d.id === docId)
      return total + (doc?.price || 0) * (copies[docId] || 1)
    }, 0)
  }

  const handleSubmit = async () => {
    const userString = sessionStorage.getItem("currentUser")
    const currentUser = userString ? JSON.parse(userString) : null

    if (!currentUser?.studentNumber) {
      return
    }

    // Store request data in sessionStorage for payment page
    const requestData = {
      studentNo: currentUser.studentNumber,
      documents: selectedDocs.map((docId) => ({
        id: docId,
        name: documents.find((d) => d.id === docId)?.name,
        copies: copies[docId],
        price: documents.find((d) => d.id === docId)?.price,
      })),
      purpose: purpose === "Other" ? customPurpose : purpose,
      deliveryMethod: deliveryMethods.find((m) => m.id === deliveryMethod)?.name,
      deliveryDetails,
      paymentMethod,
      total: calculateTotal(),
    }

    if (paymentMethod === "pickup") {
      try {
        const response = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentNo: requestData.studentNo,
            documents: requestData.documents,
            purpose: requestData.purpose,
            deliveryMethod: requestData.deliveryMethod,
            paymentMethod: "Cash on Pickup",
            total: requestData.total,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to submit request.")
        }

        const referenceNumber = data.requests?.[0]?.referenceNo || `REQ-${Date.now()}`
        const receiptData = {
          ...requestData,
          referenceNumber,
          paymentReference: `PAY-${Date.now()}`,
          paymentMethod: "Cash on Pickup",
          paymentDate: new Date().toISOString(),
          status: "Pending Payment",
        }

        sessionStorage.setItem("receiptData", JSON.stringify(receiptData))
        sessionStorage.removeItem("pendingRequest")
        router.push(`/dashboard/track?ref=${encodeURIComponent(referenceNumber)}&new=1`)
      } catch (error) {
        console.error("Pickup submit error:", error)
      }
      return
    }

    sessionStorage.setItem("pendingRequest", JSON.stringify(requestData))
    router.push("/dashboard/payment")
  }

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Request Documents</h1>
        <p className="text-muted-foreground mb-8">Follow the steps to complete your document request</p>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step === s.id
                      ? "bg-primary text-primary-foreground"
                      : steps.findIndex((item) => item.id === step) > steps.findIndex((item) => item.id === s.id)
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {steps.findIndex((item) => item.id === step) > steps.findIndex((item) => item.id === s.id) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-2 text-muted-foreground">{s.label}</span>
              </div>
              {index < 4 && <ChevronRight className="w-5 h-5 text-muted-foreground mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Documents */}
        {step === "select" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Select Documents</h2>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => toggleDocument(doc.id)} />
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">PHP {doc.price}.00 per copy</p>
                    </div>
                  </div>
                  {selectedDocs.includes(doc.id) && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`copies-${doc.id}`} className="text-sm">
                        Copies:
                      </Label>
                      <Input
                        id={`copies-${doc.id}`}
                        type="number"
                        min="1"
                        max="10"
                        value={copies[doc.id] || 1}
                        onChange={(e) => updateCopies(doc.id, Number.parseInt(e.target.value))}
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep("details")} disabled={selectedDocs.length === 0}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Purpose & Details */}
        {step === "details" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Purpose of Request</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Purpose</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {purposes.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPurpose(p)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        purpose === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {purpose === "Other" && (
                <div className="space-y-2">
                  <Label htmlFor="customPurpose">Specify Purpose</Label>
                  <Input
                    id="customPurpose"
                    placeholder="Enter your purpose"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={() => setStep("delivery")} disabled={!purpose}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Delivery Method */}
        {step === "delivery" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Release Option</h2>
            <div className="space-y-4">
              <div className="space-y-3">
                {deliveryMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setDeliveryMethod(method.id)}
                    className={`w-full p-4 border rounded-lg text-left transition-colors ${
                      deliveryMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-foreground">{method.name}</p>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </button>
                ))}
              </div>

              {deliveryMethod === "pickup" && (
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickupDate">Preferred Pickup Date</Label>
                    <Input
                      id="pickupDate"
                      type="date"
                      value={deliveryDetails.pickupDate}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, pickupDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupTime">Preferred Time</Label>
                    <Input
                      id="pickupTime"
                      type="time"
                      value={deliveryDetails.pickupTime}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, pickupTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button onClick={() => setStep("payment")} disabled={!deliveryMethod}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Payment */}
        {step === "payment" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Payment Method</h2>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {selectedDocs.map((docId) => {
                    const doc = documents.find((d) => d.id === docId)
                    return (
                      <div key={docId} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {doc?.name} x {copies[docId]}
                        </span>
                        <span className="font-medium">PHP {(doc?.price || 0) * (copies[docId] || 1)}.00</span>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-border flex justify-between font-bold">
                    <span>Total</span>
                    <span>PHP {calculateTotal()}.00</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod("online")}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">Pay Online</p>
                  <p className="text-sm text-muted-foreground">Credit Card, Debit Card, or PayPal</p>
                </button>
                <button
                  onClick={() => setPaymentMethod("pickup")}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    paymentMethod === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-foreground">Pay on Pickup</p>
                  <p className="text-sm text-muted-foreground">Cash payment at registrar office</p>
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("delivery")}>
                Back
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!paymentMethod}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 5: Confirmation */}
        {step === "confirm" && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Request</h2>
              <p className="text-muted-foreground">Please review all details before submitting</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Documents</h3>
                <div className="space-y-1">
                  {selectedDocs.map((docId) => {
                    const doc = documents.find((d) => d.id === docId)
                    return (
                      <p key={docId} className="text-sm text-muted-foreground">
                        • {doc?.name} ({copies[docId]} {copies[docId] === 1 ? "copy" : "copies"})
                      </p>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Purpose</h3>
                <p className="text-sm text-muted-foreground">{purpose === "Other" ? customPurpose : purpose}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Release Option</h3>
                <p className="text-sm text-muted-foreground">
                  {deliveryMethods.find((m) => m.id === deliveryMethod)?.name}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Payment</h3>
                <p className="text-sm text-muted-foreground">
                  {paymentMethod === "online" ? "Pay Online" : "Pay on Pickup"}
                </p>
                <p className="text-lg font-bold text-foreground mt-1">Total: PHP {calculateTotal()}.00</p>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep("payment")}>
                Back
              </Button>
              <Button onClick={handleSubmit} size="lg">
                Submit Request
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
