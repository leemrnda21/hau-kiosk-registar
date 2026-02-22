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

    const updated = await prisma.student.update({
      where: { id },
      data: {
        status: action === "approve" ? "Active" : "Rejected",
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
