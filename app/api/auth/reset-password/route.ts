import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ResetPasswordPayload = {
  token: string;
  password: string;
};

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

const isPasswordValid = (value: string) => {
  return value.length >= 4;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ResetPasswordPayload>;
    const token = body.token?.trim();
    const password = body.password?.trim();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Token and password are required." },
        { status: 400 }
      );
    }

    if (!isPasswordValid(password)) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { student: true },
    });

    if (!tokenRecord || tokenRecord.usedAt) {
      return NextResponse.json(
        { success: false, message: "This reset link is invalid or has been used." },
        { status: 400 }
      );
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "This reset link has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.student.update({
        where: { id: tokenRecord.studentId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password has been reset. You can sign in now.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password." },
      { status: 500 }
    );
  }
}
