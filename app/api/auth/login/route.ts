import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LoginPayload = {
  email: string;
  password: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LoginPayload>;
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { email },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const matches = await bcrypt.compare(password, student.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (student.status?.toLowerCase() !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is pending approval. Please wait for admin activation.",
          approvalPending: true,
          student: {
            id: student.id,
            studentNo: student.studentNo,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
          },
        },
        { status: 403 }
      );
    }

    const enrollment = await prisma.faceEnrollment.findUnique({
      where: { studentId: student.id },
      select: { id: true },
    })

    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "Face enrollment required before login.",
          enrollmentRequired: true,
          student: {
            id: student.id,
            studentNo: student.studentNo,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentNo: student.studentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sign in." },
      { status: 500 }
    );
  }
}
