"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, User, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function AuthPage() {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Choose Authentication Method</h1>
            <p className="text-lg text-muted-foreground">Select how you'd like to verify your identity</p>
            <div className="mt-6 flex justify-center">
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/register">Create test account</Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Email Login */}
            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedMethod === "email" ? "border-2 border-primary" : ""
              }`}
              onClick={() => setSelectedMethod("email")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">School Email</h3>
                  <p className="text-sm text-muted-foreground">Login with your HAU email and password</p>
                </div>
              </div>
            </Card>

            {/* Facial Recognition */}
            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedMethod === "face" ? "border-2 border-primary" : ""
              }`}
              onClick={() => setSelectedMethod("face")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Facial Recognition</h3>
                  <p className="text-sm text-muted-foreground">Student number + face verification</p>
                </div>
              </div>
            </Card>

            {/* Combined Method */}
            <Card
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedMethod === "combined" ? "border-2 border-primary" : ""
              }`}
              onClick={() => setSelectedMethod("combined")}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Combined</h3>
                  <p className="text-sm text-muted-foreground">Email + Student ID + Face (Most Secure)</p>
                </div>
              </div>
            </Card>
          </div>

          {selectedMethod && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" asChild>
                <Link href={selectedMethod === "email" ? "/auth/email" : selectedMethod === "face" ? "/auth/face-student" : "/auth/combined"}>
                  Continue with{" "}
                  {selectedMethod === "email"
                    ? "Email"
                    : selectedMethod === "face"
                      ? "Facial Recognition"
                      : "Combined Method"}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
