import type React from "react"
import AdminGuard from "./admin-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AdminGuard />
      {children}
    </>
  )
}
