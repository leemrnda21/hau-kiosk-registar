"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

type PendingEnrollment = {
  studentNo?: string
  email?: string
  name?: string
}

export default function DashboardGuard() {
  const router = useRouter()

  useEffect(() => {
    const storedPending = sessionStorage.getItem("pendingFaceEnrollment")
    if (storedPending) {
      try {
        const parsed = JSON.parse(storedPending) as PendingEnrollment
        if (parsed?.studentNo) {
          const params = new URLSearchParams({
            studentNo: parsed.studentNo,
            email: parsed.email || "",
            name: parsed.name || "",
          })
          router.replace(`/face-enrollment?${params.toString()}`)
          return
        }
      } catch (error) {
        console.error("Pending enrollment parse error:", error)
      }
    }

    const userString = sessionStorage.getItem("currentUser")
    if (!userString) {
      return
    }

    let user: { studentNumber?: string; fullName?: string; email?: string } | null = null
    try {
      user = JSON.parse(userString)
    } catch (error) {
      console.error("Current user parse error:", error)
      return
    }

    if (!user?.studentNumber) {
      return
    }

    const checkEnrollment = async () => {
      try {
        const response = await fetch(
          `/api/face-enrollment?studentNo=${encodeURIComponent(user.studentNumber as string)}`
        )
        const data = await response.json()
        if (response.ok && data?.success && data?.enrolled) {
          sessionStorage.setItem("faceEnrollmentComplete", "true")
          return
        }

        const pending: PendingEnrollment = {
          studentNo: user.studentNumber,
          email: user.email,
          name: user.fullName,
        }
        sessionStorage.setItem("pendingFaceEnrollment", JSON.stringify(pending))
        const params = new URLSearchParams({
          studentNo: pending.studentNo || "",
          email: pending.email || "",
          name: pending.name || "",
        })
        router.replace(`/face-enrollment?${params.toString()}`)
      } catch (error) {
        console.error("Face enrollment check error:", error)
      }
    }

    checkEnrollment()
  }, [router])

  return null
}
