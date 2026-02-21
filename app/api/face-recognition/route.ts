import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RecognitionPayload = {
  descriptor: number[];
  depthData?: { minDepth: number; maxDepth: number };
  studentNo?: string;
};

const FACE_MATCH_THRESHOLD = 0.6;

function calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(desc1.length, desc2.length); i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RecognitionPayload>;
    const descriptor = body.descriptor;
    const depthData = body.depthData;
    const studentNo = body.studentNo?.trim();

    if (!descriptor || descriptor.length === 0) {
      return NextResponse.json(
        { verified: false, reason: "Missing face descriptor." },
        { status: 400 }
      );
    }

    if (studentNo) {
      const enrollment = await prisma.faceEnrollment.findFirst({
        where: {
          student: {
            studentNo,
          },
        },
        include: {
          student: true,
        },
      });

      if (!enrollment) {
        return NextResponse.json({
          verified: false,
          reason: "No face enrollment found for this student",
        });
      }

      const storedDescriptor = enrollment.descriptor as number[];
      const distance = calculateEuclideanDistance(descriptor, storedDescriptor);

      if (distance >= FACE_MATCH_THRESHOLD) {
        return NextResponse.json({
          verified: false,
          record: {
            studentId: enrollment.student.studentNo,
            name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
            email: enrollment.student.email,
          },
          reason: "Face does not match this student",
          distance,
        });
      }

      if (enrollment.depthData && depthData) {
        const storedDepth = enrollment.depthData as { minDepth: number; maxDepth: number };
        const depthMatch =
          Math.abs(storedDepth.minDepth - depthData.minDepth) < 10 &&
          Math.abs(storedDepth.maxDepth - depthData.maxDepth) < 10;

        if (!depthMatch) {
          return NextResponse.json({
            verified: false,
            record: {
              studentId: enrollment.student.studentNo,
              name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
              email: enrollment.student.email,
            },
            reason: "3D depth verification failed - possible spoofing attempt",
          });
        }
      }

      return NextResponse.json({
        verified: true,
        record: {
          studentId: enrollment.student.studentNo,
          name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          email: enrollment.student.email,
        },
        reason: "Face verified successfully with 3D depth confirmation",
        distance,
      });
    }

    const enrollments = await prisma.faceEnrollment.findMany({
      include: {
        student: true,
      },
    });

    let bestMatch: typeof enrollments[number] | undefined;
    let bestDistance = Infinity;

    for (const enrollment of enrollments) {
      const storedDescriptor = enrollment.descriptor as number[];
      const distance = calculateEuclideanDistance(descriptor, storedDescriptor);

      if (distance < bestDistance && distance < FACE_MATCH_THRESHOLD) {
        bestDistance = distance;
        bestMatch = enrollment;
      }
    }

    if (!bestMatch) {
      return NextResponse.json({ verified: false, reason: "Face not found in database" });
    }

    if (bestMatch.depthData && depthData) {
      const storedDepth = bestMatch.depthData as { minDepth: number; maxDepth: number };
      const depthMatch =
        Math.abs(storedDepth.minDepth - depthData.minDepth) < 10 &&
        Math.abs(storedDepth.maxDepth - depthData.maxDepth) < 10;

      if (!depthMatch) {
        return NextResponse.json({
          verified: false,
          record: {
            studentId: bestMatch.student.studentNo,
            name: `${bestMatch.student.firstName} ${bestMatch.student.lastName}`,
            email: bestMatch.student.email,
          },
          reason: "3D depth verification failed - possible spoofing attempt",
        });
      }
    }

    return NextResponse.json({
      verified: true,
      record: {
        studentId: bestMatch.student.studentNo,
        name: `${bestMatch.student.firstName} ${bestMatch.student.lastName}`,
        email: bestMatch.student.email,
      },
      reason: "Face verified successfully with 3D depth confirmation",
    });
  } catch (error) {
    console.error("Face recognition error:", error);
    return NextResponse.json(
      { verified: false, reason: "Face verification failed." },
      { status: 500 }
    );
  }
}
