import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/sse-broker";

export const runtime = "nodejs";

type RequestPayload = {
  studentNo: string;
  documents: Array<{
    id: string;
    name: string;
    copies: number;
    price: number;
  }>;
  purpose?: string;
  deliveryMethod?: string;
  paymentMethod?: string;
  paymentReference?: string;
  total?: number;
};

const documentTypeMap: Record<string, string> = {
  "tor-official": "transcript_of_records_official",
  "tor-unofficial": "transcript_of_records_unofficial",
  cog: "certificate_of_grades",
  coe: "certificate_of_enrollment",
  gmc: "certificate_of_good_moral_character",
  diploma: "diploma",
  hd: "honorable_dismissal",
  cue: "certificate_of_units_earned",
};

const toReferencePrefix: Record<string, string> = {
  transcript_of_records_official: "TOR",
  transcript_of_records_unofficial: "TOR",
  certificate_of_grades: "COG",
  certificate_of_enrollment: "COE",
  certificate_of_good_moral_character: "GMC",
  diploma: "DIP",
  honorable_dismissal: "HD",
  certificate_of_units_earned: "CUE",
  certificate_of_transfer_credential: "CTC",
  certificate_of_graduation: "COGRA",
};

const buildReferenceNo = (prefix: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
};


export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RequestPayload>;
    const studentNo = body.studentNo?.trim();
    const documents = body.documents ?? [];
    const paymentReference =
      body.paymentReference?.trim() || (body.paymentMethod ? `PAY-${Date.now()}` : null);

    if (!studentNo) {
      return NextResponse.json(
        { success: false, message: "Student number is required." },
        { status: 400 }
      );
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one document is required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentNo },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      );
    }

    const created = await prisma.$transaction(
      documents.map((doc) => {
        const mappedType = documentTypeMap[doc.id];
        if (!mappedType) {
          throw new Error(`Unsupported document type: ${doc.id}`);
        }

        const prefix = toReferencePrefix[mappedType] || "DOC";
        const perDocumentTotal = (doc.price ?? 0) * (doc.copies ?? 1);
        return prisma.documentRequest.create({
          data: {
            studentId: student.id,
            type: mappedType as never,
            status: "pending",
            referenceNo: buildReferenceNo(prefix),
            copies: doc.copies ?? 1,
            purpose: body.purpose,
            deliveryMethod: body.deliveryMethod,
            paymentMethod: body.paymentMethod,
            paymentReference: paymentReference,
            totalAmount: perDocumentTotal,
          },
        });
      })
    );

    created.forEach((request) => {
      broadcastEvent({
        type: "request-created",
        data: { studentNo, requestId: request.id },
      });
    });

    return NextResponse.json({ success: true, requests: created });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit request." },
      { status: 500 }
    );
  }
}
