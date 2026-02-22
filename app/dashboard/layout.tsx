import type React from "react"
import ChatWidget from "./chat-widget"
import DashboardGuard from "./dashboard-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DashboardGuard />
      {children}
      <ChatWidget />
    </>
  )
}
