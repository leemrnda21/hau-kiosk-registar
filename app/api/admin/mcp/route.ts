import { NextResponse } from "next/server"
import { callMcpTool, mcpTools } from "@/lib/admin-mcp"

export const runtime = "nodejs"

type McpCallPayload = {
  tool: string
  args?: Record<string, unknown>
}

export async function GET() {
  return NextResponse.json({
    success: true,
    tools: mcpTools,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<McpCallPayload>
    const tool = body.tool?.trim()
    const args = body.args || {}

    if (!tool) {
      return NextResponse.json(
        { success: false, message: "Tool name is required." },
        { status: 400 }
      )
    }

    const result = await callMcpTool(tool, args)
    return NextResponse.json({ success: true, tool, result })
  } catch (error) {
    console.error("Admin MCP error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to execute MCP tool." },
      { status: 500 }
    )
  }
}
