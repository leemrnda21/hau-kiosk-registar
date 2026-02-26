import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Admin audit log fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load audit logs." },
      { status: 500 }
    );
  }
}
