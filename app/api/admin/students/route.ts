import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const statusFilter = status ? (status as "Pending" | "Active" | "Rejected") : undefined;

    const students = await prisma.student.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
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
