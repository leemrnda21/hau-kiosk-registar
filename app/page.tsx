import Link from "next/link"
import { Mic, Hand, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-circle.png"
              alt="HAU seal"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">Holy Angel University</h1>
              <p className="text-sm text-muted-foreground">Registrar Services</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/help">
              <HelpCircle className="w-4 h-4 mr-2" />
              Need Help?
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Welcome to Online Registrar Services
          </h2>
          <p className="text-lg text-muted-foreground text-balance">
            Request and retrieve your academic documents with ease. Choose your preferred interaction mode to get
            started.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Voice Mode Card */}
          <Link href="/voice-mode" className="group">
            <Card className="h-full p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary cursor-pointer">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mic className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Voice Mode</h3>
                  <p className="text-muted-foreground text-balance">
                    Interact using voice commands with our intelligent assistant. Perfect for hands-free navigation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Speech Recognition</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Guided Experience</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Accessible</span>
                </div>
              </div>
            </Card>
          </Link>

          {/* Touch Mode Card */}
          <Link href="/auth" className="group">
            <Card className="h-full p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary cursor-pointer">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Hand className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Touch Mode</h3>
                  <p className="text-muted-foreground text-balance">
                    Traditional interface with forms and buttons. Navigate at your own pace with familiar controls.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Traditional Forms</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Self-Paced</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Intuitive</span>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold text-foreground mb-3">Available Services</h3>
            <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Transcript of Records (TOR)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Certificate of Grades
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Certificate of Enrollment
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Good Moral Character
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Diploma (Authenticated Copy)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Honorable Dismissal
              </li>
            </ul>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Holy Angel University Registrar Office</p>
          <p className="mt-1">Contact: registrar@hau.edu.ph | (045) 888-8888</p>
        </div>
      </footer>
    </div>
  )
}
