import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreatePayload = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreatePayload>;
    const email = body.email?.trim().toLowerCase();
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const password = body.password?.trim();
    const role = body.role?.trim() || "admin";

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Admin already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { email, firstName, lastName, passwordHash, role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return NextResponse.json({ success: true, admin });
  } catch (error) {
    console.error("Admin create error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create admin." },
      { status: 500 }
    );
  }
}
