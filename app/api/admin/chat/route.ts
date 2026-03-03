import { NextResponse } from "next/server"
import { callMcpTool, describeToolResult, mcpTools } from "@/lib/admin-mcp"

export const runtime = "nodejs"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ChatPayload = {
  message?: string
  history?: ChatMessage[]
}

const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"
const HF_ENDPOINT = `https://api-inference.huggingface.co/models/${HF_MODEL}`

const buildIntentPrompt = (message: string, history: ChatMessage[]) => {
  const historyText = history
    .slice(-4)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n")

  return `You are an intent classifier for an admin chatbot. Choose the best tool and extract arguments.

Tools:
${mcpTools
  .map((tool) => `- ${tool.name}: ${tool.description}`)
  .join("\n")}

Rules:
- Return JSON only.
- If no tool fits, set tool to "none" and args to {}.
- If a student number is mentioned, place it in args.studentNo.
    - If the user asks for names, prefer list_student_names.
    - If they mention failing/failed/low grades, use list_failing_students.
    - If they mention passing/above 75, use list_passing_students.
    - If they ask for grades/subjects for one student, use get_student_grades.
    - If they provide a student name, put it in args.name.
    - If they ask about document requests, use list_document_requests.
    - If they ask about a specific student's requests, use get_student_requests and pass name or studentNo.

Conversation:
${historyText}
User: ${message}

Respond with JSON:
{"tool":"...","args":{...}}
`
}

const parseToolCall = (text: string) => {
  try {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end === -1) {
      return null
    }
    const json = text.slice(start, end + 1)
    return JSON.parse(json) as { tool?: string; args?: Record<string, unknown> }
  } catch {
    return null
  }
}

const fallbackIntent = (message: string) => {
  const text = message.toLowerCase()
  if (text.includes("fail") || text.includes("failing") || text.includes("low")) {
    return { tool: "list_failing_students", args: {} }
  }
  if (text.includes("pass") || text.includes("passing") || text.includes("above 75")) {
    return { tool: "list_passing_students", args: {} }
  }
  if (text.includes("request") || text.includes("requests") || text.includes("document")) {
    const match = text.match(/\b\d{4}-\d{4,6}\b/)
    if (match) {
      return { tool: "get_student_requests", args: { studentNo: match[0] } }
    }
    const nameMatch = text.match(/requests?\s+(?:for|of)?\s*([a-z\s.'-]+)/i)
    if (nameMatch && nameMatch[1]) {
      return { tool: "get_student_requests", args: { name: nameMatch[1].trim() } }
    }
    return { tool: "list_document_requests", args: {} }
  }
  if (text.includes("name")) {
    return { tool: "list_student_names", args: {} }
  }
  if (text.includes("grade") || text.includes("grades") || text.includes("subject")) {
    const match = text.match(/\b\d{4}-\d{4,6}\b/)
    if (match) {
      return { tool: "get_student_grades", args: { studentNo: match[0] } }
    }
    const nameMatch = text.match(/grades?\s+(?:for|of)?\s*([a-z\s.'-]+)/i)
    if (nameMatch && nameMatch[1]) {
      return { tool: "get_student_grades", args: { name: nameMatch[1].trim() } }
    }
    const listMatch = text.match(/list\s+grades?\s+([a-z\s.'-]+)/i)
    if (listMatch && listMatch[1]) {
      return { tool: "get_student_grades", args: { name: listMatch[1].trim() } }
    }
    const tokens = text
      .replace(/[^a-z\s.'-]/g, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 2 &&
          ![
            "list",
            "grade",
            "grades",
            "subject",
            "subjects",
            "show",
            "get",
            "all",
          ].includes(token)
      )
    if (tokens.length >= 2) {
      const nameGuess = tokens.slice(-2).join(" ")
      return { tool: "get_student_grades", args: { name: nameGuess } }
    }
  }
  if (text.includes("request") || text.includes("requests") || text.includes("document")) {
    const tokens = text
      .replace(/[^a-z\s.'-]/g, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 2 &&
          ![
            "request",
            "requests",
            "document",
            "documents",
            "show",
            "get",
            "list",
            "all",
          ].includes(token)
      )
    if (tokens.length >= 2) {
      const nameGuess = tokens.slice(-2).join(" ")
      return { tool: "get_student_requests", args: { name: nameGuess } }
    }
  }
  if (text.includes("list") || text.includes("all student") || text.includes("students")) {
    return { tool: "list_students", args: {} }
  }
  const match = text.match(/\b\d{4}-\d{4,6}\b/)
  if (match) {
    return { tool: "get_student", args: { studentNo: match[0] } }
  }
  return { tool: "none", args: {} }
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
        max_new_tokens: 120,
        temperature: 0.2,
        return_full_text: false,
      },
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as Array<{ generated_text?: string }>
  return data?.[0]?.generated_text || null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatPayload>
    const message = body.message?.trim() || ""
    const history = body.history ?? []

    if (!message) {
      return NextResponse.json({ success: true, answer: "Hi admin, how can I help?" })
    }

    let intent = fallbackIntent(message)

    if (
      /\bwhat\s+can\s+you\s+do\b|\bhelp\b|\bcapabilit|\bcommands\b|\bcan you do\b|\bwhat do you do\b/i.test(
        message
      )
    ) {
      return NextResponse.json({
        success: true,
        answer: [
          "I can help with:",
          "• Listing students and names",
          "• Showing failing or passing students",
          "• Showing all grades for a specific student",
          "• Listing document requests or a student's requests",
          "",
          "Try: 'list students', 'show grades for Elise Navarro', 'who are failing', 'list document requests'.",
        ].join("\n"),
      })
    }

    const hfPrompt = buildIntentPrompt(message, history)
    const hfAnswer = await callHuggingFace(hfPrompt)
    const parsed = hfAnswer ? parseToolCall(hfAnswer) : null
    if (parsed?.tool) {
      intent = { tool: parsed.tool, args: parsed.args || {} }
    }

    if (intent.tool === "list_students") {
      const text = message.toLowerCase()
    if (text.includes("grade") || text.includes("grades") || text.includes("subject")) {
      const match = text.match(/\b\d{4}-\d{4,6}\b/)
      if (match) {
        intent = { tool: "get_student_grades", args: { studentNo: match[0] } }
      }
    }
    }

    if (intent.tool === "none") {
      return NextResponse.json({
        success: true,
        answer:
          "I can list students, show names, show failing or passing grades, display a student's grades, and review document requests. What do you want?",
      })
    }

    const result = await callMcpTool(intent.tool, intent.args || {})
    const summary = describeToolResult(intent.tool, result)

    return NextResponse.json({
      success: true,
      answer: summary,
      tool: intent.tool,
      data: result,
    })
  } catch (error) {
    console.error("Admin chat error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to process admin chat request." },
      { status: 500 }
    )
  }
}
