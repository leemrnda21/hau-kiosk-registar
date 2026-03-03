import type React from "react"
import AdminGuard from "./admin-guard"
import AdminChatWidget from "@/components/admin-chat-widget"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AdminGuard />
      {children}
      <AdminChatWidget />
    </>
  )
}
