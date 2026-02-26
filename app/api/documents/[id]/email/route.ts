import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocumentPdf } from "@/lib/pdf-templates";

export const runtime = "nodejs";

type EmailPayload = {
  to?: string;
  studentNo?: string;
};

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const formatDocumentType = (value: string) => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await params;
    const body = (await request.json()) as EmailPayload;
    const to = body.to?.trim();
    const studentNo = body.studentNo?.trim();

    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { success: false, message: "A valid recipient email is required." },
        { status: 400 }
      );
    }

    const requestRecord = await prisma.documentRequest.findUnique({
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

    if (!requestRecord) {
      return NextResponse.json(
        { success: false, message: "Document request not found." },
        { status: 404 }
      );
    }

    if (studentNo && requestRecord.student.studentNo !== studentNo) {
      return NextResponse.json(
        { success: false, message: "Request does not belong to this student." },
        { status: 403 }
      );
    }

    if (requestRecord.status !== "ready") {
      return NextResponse.json(
        { success: false, message: "Document is not ready to send." },
        { status: 403 }
      );
    }

    const pdfBytes = await generateDocumentPdf(requestRecord.student, {
      id: requestRecord.id,
      referenceNo: requestRecord.referenceNo,
      type: requestRecord.type,
      requestedAt: requestRecord.requestedAt,
      completedAt: requestRecord.completedAt,
      status: requestRecord.status,
    });

    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM?.trim();

    if (!resendKey || !resendFrom) {
      return NextResponse.json(
        { success: false, message: "Email service is not configured." },
        { status: 500 }
      );
    }

    const hasValidFromFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFrom)
      || /^[^<>]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(resendFrom);

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

    const documentType = formatDocumentType(requestRecord.type);
    const studentName = `${requestRecord.student.firstName} ${requestRecord.student.lastName}`.trim();
    const attachmentName = `HAU-${requestRecord.referenceNo}.pdf`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [to],
        subject: `Your ${documentType} is ready`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7a1f2b;">Holy Angel University</h2>
            <p>Hi ${studentName || "Student"},</p>
            <p>Your request for <strong>${documentType}</strong> (Reference: ${requestRecord.referenceNo}) is ready.</p>
            <p>The document is attached to this email.</p>
            <p style="color: #666;">If you have any questions, please contact the Registrar Office.</p>
          </div>
        `,
        attachments: [
          {
            filename: attachmentName,
            content: Buffer.from(pdfBytes).toString("base64"),
            content_type: "application/pdf",
          },
        ],
      }),
    });

    const responseText = await response.text();
    const responseJson = responseText ? JSON.parse(responseText) : null;

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

    if (responseJson?.id) {
      console.log("Resend email id:", responseJson.id);
    }

    return NextResponse.json({
      success: true,
      message: `Document sent to ${to}`,
      resendId: responseJson?.id || null,
    });
  } catch (error) {
    console.error("Document email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send document email." },
      { status: 500 }
    );
  }
}
