import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocumentPdf } from "@/lib/pdf-templates";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const requestId = context.params.id;

    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: {
            studentNo: true,
            firstName: true,
            lastName: true,
            course: true,
            yearLevel: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, message: "Document request not found." },
        { status: 404 }
      );
    }

    const pdfBytes = await generateDocumentPdf(request.student, {
      id: request.id,
      referenceNo: request.referenceNo,
      type: request.type,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      status: request.status,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=HAU-${request.referenceNo}.pdf`,
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate document." },
      { status: 500 }
    );
  }
}
