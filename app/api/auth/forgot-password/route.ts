import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ForgotPasswordPayload = {
  email: string;
};

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const getAppUrl = () => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    return "http://localhost:3000";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ForgotPasswordPayload>;
    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "A valid email is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Email not found." },
        { status: 404 }
      );
    }

    const recentToken = await prisma.passwordResetToken.findFirst({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recentToken) {
      const elapsedMs = Date.now() - recentToken.createdAt.getTime();
      if (elapsedMs < 60 * 1000) {
        return NextResponse.json({
          success: true,
          message: "Reset link already sent. Please wait before retrying.",
        });
      }
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        studentId: student.id,
        tokenHash,
        expiresAt,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: request.headers.get("user-agent"),
      },
    });

    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM?.trim();
    const resetRecipient = process.env.PASSWORD_RESET_TO?.trim();

    if (!resendKey || !resendFrom || !resetRecipient) {
      return NextResponse.json(
        { success: false, message: "Email service is not configured." },
        { status: 500 }
      );
    }

    const hasValidFromFormat =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFrom) ||
      /^[^<>]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(resendFrom);

    if (!hasValidFromFormat) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid RESEND_FROM format. Use email@example.com or Name <email@example.com>.",
        },
        { status: 400 }
      );
    }

    const appUrl = getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [resetRecipient],
        subject: "Reset your RegiSmart password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7a1f2b;">Holy Angel University</h2>
            <p>Hi ${studentName || "Student"},</p>
            <p>We received a request to reset your RegiSmart password.</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; background: #7a1f2b; color: #fff; padding: 12px 18px; text-decoration: none; border-radius: 6px;">
                Reset Password
              </a>
            </p>
            <p style="color: #666;">This link will expire in 30 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
        text: `Hi ${studentName || "Student"},\n\nWe received a request to reset your RegiSmart password.\n\nReset your password: ${resetUrl}\n\nThis link will expire in 30 minutes. If you didn't request this, you can ignore this email.`,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error("Resend API error:", responseText);
      return NextResponse.json(
        {
          success: false,
          message: `Resend error: ${responseText || "Unknown error"}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to request password reset." },
      { status: 500 }
    );
  }
}
