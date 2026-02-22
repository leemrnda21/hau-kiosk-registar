import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingRequests, approvedToday, rejectedToday, pendingStudents, recentRequests] =
      await Promise.all([
        prisma.documentRequest.count({
          where: { status: "pending" },
        }),
        prisma.documentRequest.count({
          where: {
            status: "processing",
            requestedAt: { gte: today },
          },
        }),
        prisma.documentRequest.count({
          where: {
            status: "submitted",
            requestedAt: { gte: today },
          },
        }),
        prisma.student.count({
          where: { status: "Pending" },
        }),
        prisma.documentRequest.findMany({
          orderBy: { requestedAt: "desc" },
          take: 5,
          include: {
            student: {
              select: {
                studentNo: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      stats: {
        pendingRequests,
        approvedToday,
        rejectedToday,
        pendingStudents,
      },
      recentRequests,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load overview." },
      { status: 500 }
    );
  }
}
