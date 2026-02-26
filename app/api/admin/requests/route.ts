import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const needsVerification = searchParams.get("needsVerification")?.trim();
    const requestId = searchParams.get("requestId")?.trim();
    const statusFilter = status
      ? (status as "pending" | "processing" | "submitted" | "ready" | "rejected")
      : undefined;

    const requests = await prisma.documentRequest.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(requestId ? { id: requestId } : {}),
        ...(needsVerification === "true"
          ? {
              paymentVerifiedAt: null,
              paymentMethod: { not: null },
              status: { in: ["pending", "processing"] },
            }
          : {}),
      },
      orderBy: { requestedAt: "desc" },
      include: {
        student: {
          select: {
            studentNo: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Admin requests error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load requests." },
      { status: 500 }
    );
  }
}
