import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type EnrollmentPayload = {
  studentNo: string;
  descriptor: number[];
  depthData?: { minDepth: number; maxDepth: number };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentNo = searchParams.get("studentNo")?.trim()

    if (!studentNo) {
      return NextResponse.json(
        { success: false, message: "Student number is required." },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { studentNo },
      select: { id: true },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      )
    }

    const enrollment = await prisma.faceEnrollment.findUnique({
      where: { studentId: student.id },
      select: { id: true },
    })

    return NextResponse.json({ success: true, enrolled: Boolean(enrollment) })
  } catch (error) {
    console.error("Face enrollment lookup error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to check face enrollment." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<EnrollmentPayload>;
    const studentNo = body.studentNo?.trim();
    const descriptor = body.descriptor;
    const depthData = body.depthData;

    if (!studentNo || !descriptor || descriptor.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing enrollment data." },
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

    const enrollment = await prisma.faceEnrollment.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        descriptor,
        depthData,
      },
      update: {
        descriptor,
        depthData,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Face enrollment saved.",
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    console.error("Face enrollment error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save face enrollment." },
      { status: 500 }
    );
  }
}
