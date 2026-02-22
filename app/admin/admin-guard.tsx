"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

export default function AdminGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/admin/login") {
      return
    }
    const adminString = sessionStorage.getItem("currentAdmin")
    if (!adminString) {
      router.replace("/admin/login")
    }
  }, [pathname, router])

  return null
}
