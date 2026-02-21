import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNo = searchParams.get("studentNo")?.trim();
    const referenceNo = searchParams.get("referenceNo")?.trim();

    if (!studentNo) {
      return NextResponse.json(
        { success: false, message: "Student number is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentNo },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      );
    }

    const requests = await prisma.documentRequest.findMany({
      where: {
        studentId: student.id,
        ...(referenceNo ? { referenceNo } : {}),
      },
      orderBy: { requestedAt: "desc" },
    });

    const [pendingCount, processingCount, readyCount, submittedCount, totalCount] =
      await Promise.all([
        prisma.documentRequest.count({
          where: { studentId: student.id, status: "pending" },
        }),
        prisma.documentRequest.count({
          where: { studentId: student.id, status: "processing" },
        }),
        prisma.documentRequest.count({
          where: { studentId: student.id, status: "ready" },
        }),
        prisma.documentRequest.count({
          where: { studentId: student.id, status: "submitted" },
        }),
        prisma.documentRequest.count({
          where: { studentId: student.id },
        }),
      ]);

    return NextResponse.json({
      success: true,
      requests,
      stats: {
        pending: pendingCount + processingCount,
        ready: readyCount,
        submitted: submittedCount,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("Dashboard requests error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load requests." },
      { status: 500 }
    );
  }
}
