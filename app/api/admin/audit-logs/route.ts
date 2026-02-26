import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    const rawLogs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
    });

    const requestIds = rawLogs
      .filter(
        (log) =>
          (log.entityType === "DocumentRequest" || log.entityType === "request") && log.entityId
      )
      .map((log) => log.entityId as string);

    const studentIds = rawLogs
      .filter((log) => log.entityType === "student" && log.entityId)
      .map((log) => log.entityId as string);

    const requests = requestIds.length
      ? await prisma.documentRequest.findMany({
          where: { id: { in: requestIds } },
          select: {
            id: true,
            referenceNo: true,
            student: {
              select: {
                studentNo: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })
      : [];

    const students = studentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            studentNo: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [];

    const requestMap = new Map(
      requests.map((request) => [request.id, request])
    );
    const studentMap = new Map(
      students.map((student) => [student.id, student])
    );

    const logs = rawLogs.map((log) => {
      if ((log.entityType === "DocumentRequest" || log.entityType === "request") && log.entityId) {
        const request = requestMap.get(log.entityId);
        if (request?.student) {
          const fullName = `${request.student.firstName} ${request.student.lastName}`.trim();
          return {
            ...log,
            subjectName: fullName || null,
            studentNo: request.student.studentNo,
            studentEmail: request.student.email,
            referenceNo: request.referenceNo,
          };
        }
      }
      if (log.entityType === "student" && log.entityId) {
        const student = studentMap.get(log.entityId);
        if (student) {
          const fullName = `${student.firstName} ${student.lastName}`.trim();
          return {
            ...log,
            subjectName: fullName || null,
            studentNo: student.studentNo,
            studentEmail: student.email,
            referenceNo: null,
          };
        }
      }
      return {
        ...log,
        subjectName: null,
        studentNo: null,
        studentEmail: null,
        referenceNo: null,
      };
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
