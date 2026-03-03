import { prisma } from "@/lib/prisma"

const documentTypes = [
  "transcript_of_records_official",
  "transcript_of_records_unofficial",
  "certificate_of_grades",
  "certificate_of_enrollment",
  "certificate_of_good_moral_character",
  "diploma",
  "honorable_dismissal",
  "certificate_of_units_earned",
] as const

const toReferencePrefix: Record<(typeof documentTypes)[number], string> = {
  transcript_of_records_official: "TOR",
  transcript_of_records_unofficial: "TOR",
  certificate_of_grades: "COG",
  certificate_of_enrollment: "COE",
  certificate_of_good_moral_character: "GMC",
  diploma: "DIP",
  honorable_dismissal: "HD",
  certificate_of_units_earned: "CUE",
}

const randomPick = <T,>(items: T[], rand: () => number) =>
  items[Math.floor(rand() * items.length)]

const buildReferenceNo = (prefix: string, rand: () => number) => {
  const year = new Date().getFullYear()
  const random = Math.floor(1000 + rand() * 9000)
  return `${prefix}-${year}-${random}`
}

const createSeededRandom = (seedText: string) => {
  let seed = 0
  for (let i = 0; i < seedText.length; i += 1) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0
  }

  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 0xffffffff
  }
}

const randomCopies = (rand: () => number) => {
  const value = rand()
  if (value < 0.7) return 1
  if (value < 0.9) return 2
  return 3
}

const randomStatus = (rand: () => number) => {
  const value = rand()
  if (value < 0.5) return "pending"
  if (value < 0.75) return "processing"
  if (value < 0.9) return "submitted"
  return "ready"
}

export const ensureStudentDocumentRequests = async (studentId: string, studentNo: string) => {
  const existing = await prisma.documentRequest.count({ where: { studentId } })
  if (existing > 0) {
    return
  }

  const rand = createSeededRandom(`docs-${studentNo}`)
  const count = 2 + Math.floor(rand() * 2)
  const selected = new Set<string>()

  while (selected.size < count) {
    selected.add(randomPick(documentTypes as unknown as string[], rand))
  }

  const now = Date.now()
  const data = Array.from(selected).map((type) => {
    const status = randomStatus(rand)
    const copies = randomCopies(rand)
    const requestedAt = new Date(now - Math.floor(rand() * 1000 * 60 * 60 * 24 * 14))
    const completedAt = status === "ready" ? new Date(requestedAt.getTime() + 1000 * 60 * 60 * 24) : null
    const prefix = toReferencePrefix[type as keyof typeof toReferencePrefix] || "DOC"
    return {
      studentId,
      type: type as never,
      status: status as never,
      referenceNo: buildReferenceNo(prefix, rand),
      copies,
      requestedAt,
      completedAt,
      deliveryMethod: rand() > 0.5 ? "email" : "print",
      purpose: "Initial request",
      totalAmount: copies * 100,
    }
  })

  await prisma.documentRequest.createMany({ data })
}

export const backfillDocumentRequestsForAllStudents = async () => {
  const students = await prisma.student.findMany({ select: { id: true, studentNo: true } })
  for (const student of students) {
    await ensureStudentDocumentRequests(student.id, student.studentNo)
  }
}
