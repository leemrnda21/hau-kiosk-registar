"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, LogOut, LayoutGrid, FileText, Users } from "lucide-react"

type AdminShellProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
  { label: "Manage Document Request", href: "/admin/requests", icon: FileText },
  { label: "Manage Student Accounts", href: "/admin/students", icon: Users },
]

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    sessionStorage.removeItem("currentAdmin")
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-circle.png" alt="HAU seal" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h1 className="font-bold text-foreground">Holy Angel University</h1>
                <p className="text-xs text-muted-foreground">Registrar Admin Console</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/dashboard">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href)
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  )
}
