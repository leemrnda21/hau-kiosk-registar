import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type UpdatePayload = {
  studentNo: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  course?: string;
  yearLevel?: string;
};

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
      select: {
        studentNo: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        course: true,
        yearLevel: true,
        status: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<UpdatePayload>;
    const studentNo = body.studentNo?.trim();

    if (!studentNo) {
      return NextResponse.json(
        { success: false, message: "Student number is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.student.update({
      where: { studentNo },
      data: {
        firstName: body.firstName?.trim(),
        lastName: body.lastName?.trim(),
        email: body.email?.trim().toLowerCase(),
        phone: body.phone?.trim(),
        address: body.address?.trim(),
        course: body.course?.trim(),
        yearLevel: body.yearLevel?.trim(),
      },
      select: {
        studentNo: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        course: true,
        yearLevel: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile." },
      { status: 500 }
    );
  }
}
