import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RegisterPayload = {
  studentNo: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterPayload>;

    const studentNo = body.studentNo?.trim();
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!studentNo || !firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ studentNo }, { email }],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Student number or email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const student = await prisma.student.create({
      data: {
        studentNo,
        firstName,
        lastName,
        email,
        passwordHash,
      },
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created. Continue to facial enrollment.",
      student,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to register account." },
      { status: 500 }
    );
  }
}
