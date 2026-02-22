import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/sse-broker";

export const runtime = "nodejs";

type UpdatePayload = {
  action: "approve" | "reject";
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

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "processing" : "rejected",
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
