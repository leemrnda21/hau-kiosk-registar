import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const onHold = searchParams.get("onHold")?.trim();
    const deactivated = searchParams.get("deactivated")?.trim();
    const statusFilter = status ? (status as "Pending" | "Active" | "Rejected") : undefined;

    const students = await prisma.student.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(onHold === "true" ? { isOnHold: true } : {}),
        ...(deactivated === "true" ? { isDeactivated: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
        email: true,
        course: true,
        yearLevel: true,
        status: true,
        isOnHold: true,
        holdReason: true,
        holdUntil: true,
        isDeactivated: true,
        deactivatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error("Admin students error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load students." },
      { status: 500 }
    );
  }
}
