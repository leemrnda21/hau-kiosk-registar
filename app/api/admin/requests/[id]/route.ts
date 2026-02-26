import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/sse-broker";

export const runtime = "nodejs";

type UpdatePayload = {
  action: "approve" | "reject" | "hold" | "release" | "verify-payment" | "mark-ready";
  reason?: string;
  holdUntil?: string;
};

const buildReceiptNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OR-${year}-${random}`;
};


export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const body = (await request.json()) as Partial<UpdatePayload>;
    const { id } = context.params;
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { success: false, message: "Action is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.documentRequest.findUnique({
      where: { id },
      select: { id: true, status: true, receiptNo: true, studentId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Request not found." },
        { status: 404 }
      );
    }

    const data: Prisma.DocumentRequestUpdateInput =
      action === "approve"
        ? {
            status: "processing",
            paymentApprovedAt: new Date(),
            receiptNo: existing.receiptNo || buildReceiptNo(),
          }
        : action === "reject"
          ? { status: "rejected" }
          : action === "hold"
            ? {
                isOnHold: true,
                holdReason: body.reason?.trim() || null,
                holdUntil: body.holdUntil ? new Date(body.holdUntil) : null,
              }
            : action === "release"
              ? {
                  isOnHold: false,
                  holdReason: null,
                  holdUntil: null,
                }
              : action === "verify-payment"
                ? {
                    paymentVerifiedAt: new Date(),
                    paymentVerificationNote: body.reason?.trim() || null,
                    ...(existing.status === "pending" ? { status: "processing" } : {}),
                  }
                : action === "mark-ready"
                  ? {
                      status: "ready",
                      completedAt: new Date(),
                    }
                  : { status: "rejected" };

    const updated = await prisma.documentRequest.update({
      where: { id },
      data,
    });

    await prisma.adminAuditLog.create({
      data: {
        actorEmail: request.headers.get("x-admin-email") || null,
        action,
        entityType: "request",
        entityId: updated.id,
        reason: body.reason?.trim() || null,
        metadata: {
          referenceNo: updated.referenceNo,
          holdUntil: body.holdUntil || null,
        },
      },
    });

    const student = await prisma.student.findUnique({
      where: { id: updated.studentId },
      select: { studentNo: true },
    });

    if (student?.studentNo) {
      broadcastEvent({
        type: "request-updated",
        data: { studentNo: student.studentNo, requestId: updated.id, status: updated.status },
      });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Admin request update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update request." },
      { status: 500 }
    );
  }
}
