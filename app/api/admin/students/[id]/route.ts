import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/sse-broker";

export const runtime = "nodejs";

type UpdatePayload = {
  action: "approve" | "reject" | "hold" | "release-hold" | "deactivate" | "reactivate";
  reason?: string;
  holdUntil?: string;
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

    const updateData: Prisma.StudentUpdateInput =
      action === "approve"
        ? {
            status: "Active",
            isOnHold: false,
            holdReason: null,
            holdUntil: null,
          }
        : action === "reject"
          ? { status: "Rejected" }
          : action === "hold"
            ? {
                status: "Active",
                isOnHold: true,
                holdReason: body.reason?.trim() || null,
                holdUntil: body.holdUntil ? new Date(body.holdUntil) : null,
              }
            : action === "release-hold"
              ? {
                  isOnHold: false,
                  holdReason: null,
                  holdUntil: null,
                }
              : action === "deactivate"
              ? { isDeactivated: true, deactivatedAt: new Date() }
              : action === "reactivate"
                ? { isDeactivated: false, deactivatedAt: null }
                : { status: "Rejected" };

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    await prisma.adminAuditLog.create({
      data: {
        actorEmail: request.headers.get("x-admin-email") || null,
        action,
        entityType: "student",
        entityId: updated.id,
        reason: body.reason?.trim() || null,
        metadata: {
          studentNo: updated.studentNo,
          holdUntil: body.holdUntil || null,
        },
      },
    });

    broadcastEvent({
      type: "student-updated",
      data: { studentNo: updated.studentNo, status: updated.status },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("Admin student update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update student." },
      { status: 500 }
    );
  }
}
