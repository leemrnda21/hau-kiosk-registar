import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNo = searchParams.get("studentNo")?.trim();

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
      where: { studentId: student.id },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load documents." },
      { status: 500 }
    );
  }
}
