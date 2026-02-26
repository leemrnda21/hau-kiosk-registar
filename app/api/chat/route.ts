import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatPayload = {
  studentNo: string
  message?: string
  history?: ChatMessage[]
}

const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"
const HF_ENDPOINT = `https://api-inference.huggingface.co/models/${HF_MODEL}`

const formatDocumentType = (value: string) => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const daysSince = (value: Date) => {
  const diff = Date.now() - value.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const buildReminders = (
  requests: Array<{ status: string; requestedAt: Date; type: string; referenceNo: string }>
) => {
  const reminders: string[] = []

  requests.forEach((request) => {
    const age = daysSince(request.requestedAt)
    const label = `${formatDocumentType(request.type)} (${request.referenceNo})`

    if (request.status === "ready") {
      reminders.push(`Your ${label} is ready for email or print.`)
      return
    }

    if (request.status === "submitted") {
      reminders.push(`Your ${label} was submitted. Expect updates soon.`)
      return
    }

    if (request.status === "processing" && age >= 5) {
      reminders.push(`Your ${label} is processing. You can track it on your dashboard.`)
      return
    }

    if (request.status === "pending" && age >= 3) {
      reminders.push(`Your ${label} is pending. We will notify you when it moves forward.`)
    }
  })

  return reminders
}

const buildFallbackAnswer = (message: string, studentName: string, reminders: string[]) => {
  const text = message.toLowerCase()
  const lines: string[] = []

  if (!text.trim()) {
    lines.push(`Hi ${studentName}, how can I help today?`)
  } else if (text.includes("transcript") || text.includes("tor")) {
    lines.push(
      "You can request transcripts from the dashboard in Request Documents. Choose official or unofficial, then follow the steps to submit."
    )
  } else if (text.includes("registration") || text.includes("enrollment")) {
    lines.push(
      "For registration and enrollment questions, I can guide you through requirements and document requests. If you need a specific document, use Request Documents to submit it."
    )
  } else if (text.includes("deadline") || text.includes("when")) {
    lines.push(
      "I track your document request status in real time. If you have pending or processing requests, I will remind you here."
    )
  } else if (text.includes("status") || text.includes("track")) {
    lines.push("You can track your requests on the Track Requests page or I can summarize them here.")
  } else if (text.includes("download") || text.includes("email") || text.includes("print")) {
    lines.push("If a request is ready, you can send it by email or print it from the Ready Documents page.")
  } else {
    lines.push(
      "I can help with transcripts, registration, enrollment, and request statuses. Tell me what you need and I will guide you."
    )
  }

  if (reminders.length > 0) {
    lines.push("\nHere are your latest reminders:")
    reminders.slice(0, 3).forEach((reminder) => lines.push(`- ${reminder}`))
  }

  return lines.join(" ")
}

const buildPrompt = (
  message: string,
  history: ChatMessage[],
  context: {
    studentName: string
    studentNo: string
    course?: string | null
    yearLevel?: string | null
    requests: Array<{ type: string; status: string; referenceNo: string; requestedAt: string }>
  },
  reminders: string[]
) => {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n")

  const requestSummary = context.requests
    .map(
      (request) =>
        `${formatDocumentType(request.type)} (${request.referenceNo}) - ${request.status} - requested ${request.requestedAt}`
    )
    .join("; ")

  return `You are a helpful registrar assistant chatbot. Be concise, friendly, and accurate. Use the provided student context. Do not invent details. If unsure, ask a clarifying question.\n\nStudent Context:\nName: ${context.studentName}\nStudent No: ${context.studentNo}\nCourse: ${context.course || ""}\nYear Level: ${context.yearLevel || ""}\nRequests: ${requestSummary || "None"}\nReminders: ${reminders.join(" | ") || "None"}\n\nConversation:\n${historyText}\nUser: ${message}\nAssistant:`
}

const callHuggingFace = async (prompt: string) => {
  const apiKey = process.env.HF_API_KEY
  if (!apiKey) {
    return null
  }

  const response = await fetch(HF_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 220,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as Array<{ generated_text?: string }>
  const result = data?.[0]?.generated_text?.trim()
  return result || null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatPayload>
    const studentNo = body.studentNo?.trim()
    const message = body.message?.trim() ?? ""
    const history = body.history ?? []

    if (!studentNo) {
      return NextResponse.json(
        { success: false, message: "Student number is required." },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { studentNo },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentNo: true,
        course: true,
        yearLevel: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      )
    }

    const requests = await prisma.documentRequest.findMany({
      where: { studentId: student.id },
      orderBy: { requestedAt: "desc" },
      take: 6,
      select: {
        type: true,
        status: true,
        referenceNo: true,
        requestedAt: true,
      },
    })

    const reminders = buildReminders(
      requests.map((request) => ({
        status: request.status,
        requestedAt: request.requestedAt,
        type: request.type,
        referenceNo: request.referenceNo,
      }))
    )

    const studentName = `${student.firstName} ${student.lastName}`.trim() || "there"
    const prompt = buildPrompt(
      message || "Hello",
      history,
      {
        studentName,
        studentNo: student.studentNo,
        course: student.course,
        yearLevel: student.yearLevel,
        requests: requests.map((req) => ({
          type: req.type,
          status: req.status,
          referenceNo: req.referenceNo,
          requestedAt: req.requestedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        })),
      },
      reminders
    )

    const aiAnswer = await callHuggingFace(prompt)
    const answer =
      aiAnswer || buildFallbackAnswer(message, studentName, reminders)

    const suggestedActions = [] as Array<{ label: string; href: string }>
    if (requests.some((request) => request.status === "ready")) {
      suggestedActions.push({ label: "Ready documents", href: "/dashboard/downloads" })
    }
    if (requests.some((request) => request.status === "pending" || request.status === "processing")) {
      suggestedActions.push({ label: "Track requests", href: "/dashboard/track" })
    }
    if (requests.length === 0) {
      suggestedActions.push({ label: "Request documents", href: "/dashboard/request" })
    }

    return NextResponse.json({
      success: true,
      answer,
      reminders,
      suggestedActions,
    })
  } catch (error) {
    console.error("Chatbot error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to process chatbot request." },
      { status: 500 }
    )
  }
}
