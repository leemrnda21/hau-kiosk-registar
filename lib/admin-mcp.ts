import { prisma } from "@/lib/prisma"
import { backfillGradesForAllStudents, ensureStudentGrades } from "@/lib/grades"
import { backfillDocumentRequestsForAllStudents } from "@/lib/document-requests"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

const findStudentByIdentifier = async (args: Record<string, unknown>) => {
  const studentNo = typeof args.studentNo === "string" ? args.studentNo.trim() : undefined
  const id = typeof args.id === "string" ? args.id.trim() : undefined
  const name = typeof args.name === "string" ? args.name.trim() : undefined

  let student = null as null | {
    id: string
    studentNo: string
    firstName: string
    lastName: string
    status: string
  }
  let matches: Array<{ id: string; studentNo: string; firstName: string; lastName: string }> = []

  if (studentNo || id) {
    student = await prisma.student.findUnique({
      where: studentNo ? { studentNo } : { id: id as string },
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    })
  } else if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const [first, ...rest] = parts
    const last = rest.join(" ")
    matches = await prisma.student.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: "insensitive" as const } },
          { lastName: { contains: name, mode: "insensitive" as const } },
          {
            AND: [
              { firstName: { contains: first, mode: "insensitive" as const } },
              ...(last ? [{ lastName: { contains: last, mode: "insensitive" as const } }] : []),
            ],
          },
        ],
      },
      orderBy: { lastName: "asc" },
      take: 5,
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
      },
    })
    if (matches.length === 1) {
      const match = matches[0]
      student = await prisma.student.findUnique({
        where: { id: match.id },
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      })
    }
  }

  return { student, matches }
}

export const mcpTools: McpToolDefinition[] = [
  {
    name: "get_student",
    description: "Fetch a single student record with grades by student number or id.",
    inputSchema: {
      type: "object",
      properties: {
        studentNo: { type: "string" },
        id: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_students",
    description: "List students with basic profile and failing-grade counts.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        search: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_student_names",
    description: "List student names and numbers.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        search: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_failing_students",
    description: "List students with failing grades (<= 74).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_passing_students",
    description: "List students with passing grades (>= 75) and counts.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_student_grades",
    description: "Get all subjects and grades for a student by student number or id.",
    inputSchema: {
      type: "object",
      properties: {
        studentNo: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_document_requests",
    description: "List recent document requests with status and student details.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_student_requests",
    description: "List document requests for a specific student.",
    inputSchema: {
      type: "object",
      properties: {
        studentNo: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
  },
]

const buildSearchFilter = (search?: string) => {
  const term = search?.trim()
  if (!term) {
    return undefined
  }
  return {
    OR: [
      { studentNo: { contains: term, mode: "insensitive" as const } },
      { email: { contains: term, mode: "insensitive" as const } },
      { firstName: { contains: term, mode: "insensitive" as const } },
      { lastName: { contains: term, mode: "insensitive" as const } },
    ],
  }
}

const buildStudentSummary = async (student: { id: string; studentNo: string }) => {
  await ensureStudentGrades(student.id, student.studentNo)
  const failingCount = await prisma.grade.count({
    where: { studentId: student.id, grade: { lte: 74 } },
  })
  return failingCount
}

export const callMcpTool = async (name: string, args: Record<string, unknown>) => {
  switch (name) {
    case "get_student": {
      const studentNo = typeof args.studentNo === "string" ? args.studentNo.trim() : undefined
      const id = typeof args.id === "string" ? args.id.trim() : undefined
      if (!studentNo && !id) {
        return { error: "studentNo or id is required" }
      }
      const student = await prisma.student.findUnique({
        where: studentNo ? { studentNo } : { id: id as string },
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          lastName: true,
          email: true,
          course: true,
          yearLevel: true,
          status: true,
          isOnHold: true,
          isDeactivated: true,
        },
      })
      if (!student) {
        return { error: "Student not found." }
      }
      await ensureStudentGrades(student.id, student.studentNo)
      const grades = await prisma.grade.findMany({
        where: { studentId: student.id },
        orderBy: { subjectCode: "asc" },
        select: {
          subjectCode: true,
          subjectTitle: true,
          units: true,
          grade: true,
          equivalent: true,
        },
      })
      return { student, grades }
    }
    case "get_student_grades": {
      const { student, matches } = await findStudentByIdentifier(args)

      if (!student) {
        if (matches.length > 1) {
          return { matches }
        }
        return { error: "Student not found." }
      }

      await ensureStudentGrades(student.id, student.studentNo)
      const grades = await prisma.grade.findMany({
        where: { studentId: student.id },
        orderBy: { subjectCode: "asc" },
        select: {
          subjectCode: true,
          subjectTitle: true,
          units: true,
          grade: true,
          equivalent: true,
        },
      })
      return { student, grades }
    }
    case "list_students": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20
      const search = typeof args.search === "string" ? args.search : undefined
      await backfillGradesForAllStudents()
      await backfillDocumentRequestsForAllStudents()
      const students = await prisma.student.findMany({
        where: buildSearchFilter(search),
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          isOnHold: true,
          isDeactivated: true,
        },
      })

      const summaries = await Promise.all(
        students.map(async (student) => ({
          student,
          failingCount: await buildStudentSummary(student),
        }))
      )

      return { students: summaries }
    }
    case "list_student_names": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20
      const search = typeof args.search === "string" ? args.search : undefined
      const students = await prisma.student.findMany({
        where: buildSearchFilter(search),
        orderBy: { lastName: "asc" },
        take: limit,
        select: {
          studentNo: true,
          firstName: true,
          lastName: true,
        },
      })
      return { students }
    }
    case "list_failing_students": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20
      await backfillGradesForAllStudents()
      await backfillDocumentRequestsForAllStudents()
      const grades = await prisma.grade.findMany({
        where: { grade: { lte: 74 } },
        orderBy: [{ studentId: "asc" }, { subjectCode: "asc" }],
        select: {
          grade: true,
          equivalent: true,
          subjectCode: true,
          subjectTitle: true,
          student: {
            select: {
              studentNo: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      })
      const grouped = new Map<string, { student: any; subjects: any[] }>()
      grades.forEach((row: any) => {
        const key = row.student.studentNo
        if (!grouped.has(key)) {
          grouped.set(key, { student: row.student, subjects: [] })
        }
        grouped.get(key)?.subjects.push({
          subjectCode: row.subjectCode,
          subjectTitle: row.subjectTitle,
          grade: row.grade,
          equivalent: row.equivalent,
        })
      })
      const failing = Array.from(grouped.values())
        .slice(0, limit)
        .map((entry) => ({
          ...entry,
          subjects: entry.subjects.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
        }))
      return { failing }
    }
    case "list_passing_students": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20
      await backfillGradesForAllStudents()
      const grades = await prisma.grade.findMany({
        where: { grade: { gte: 75 } },
        orderBy: [{ studentId: "asc" }, { subjectCode: "asc" }],
        select: {
          grade: true,
          equivalent: true,
          subjectCode: true,
          subjectTitle: true,
          student: {
            select: {
              studentNo: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      })
      const grouped = new Map<string, { student: any; subjects: any[] }>()
      grades.forEach((row: any) => {
        const key = row.student.studentNo
        if (!grouped.has(key)) {
          grouped.set(key, { student: row.student, subjects: [] })
        }
        grouped.get(key)?.subjects.push({
          subjectCode: row.subjectCode,
          subjectTitle: row.subjectTitle,
          grade: row.grade,
          equivalent: row.equivalent,
        })
      })
      const passing = Array.from(grouped.values())
        .slice(0, limit)
        .map((entry) => ({
          ...entry,
          subjects: entry.subjects.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
        }))
      return { passing }
    }
    case "list_document_requests": {
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20
      const status = typeof args.status === "string" ? args.status.trim() : undefined
      await backfillDocumentRequestsForAllStudents()
      const requests = await prisma.documentRequest.findMany({
        where: status ? { status: status as never } : undefined,
        orderBy: { requestedAt: "desc" },
        take: limit,
        select: {
          id: true,
          referenceNo: true,
          type: true,
          status: true,
          requestedAt: true,
          student: {
            select: {
              studentNo: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })
      return { requests }
    }
    case "get_student_requests": {
      const { student, matches } = await findStudentByIdentifier(args)
      if (!student) {
        if (matches.length > 1) {
          return { matches }
        }
        return { error: "Student not found." }
      }
      await backfillDocumentRequestsForAllStudents()
      const requests = await prisma.documentRequest.findMany({
        where: { studentId: student.id },
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          referenceNo: true,
          type: true,
          status: true,
          requestedAt: true,
        },
      })
      return { student, requests }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export const describeToolResult = (tool: string, result: any) => {
  if (!result || result.error) {
    return result?.error || "No data returned."
  }

  if (tool === "get_student") {
    const student = result.student
    const grades = result.grades || []
    const name = `${student.firstName} ${student.lastName}`.trim()
    const header = `${name} (${student.studentNo}) - ${student.status}`
    const lines = grades.map(
      (grade: any) =>
        `- ${grade.subjectCode} ${grade.subjectTitle}: ${grade.grade} (${grade.equivalent})`
    )
    return [header, ...lines].join("\n")
  }

  if (tool === "list_students") {
    if (!result.students?.length) {
      return "I could not find any students right now. Want me to try again?"
    }
    const header = `Here is the student list (${result.students.length}). Let me know if you want details on anyone.`
    const lines = result.students.map((entry: any) => {
      const student = entry.student
      const name = `${student.firstName} ${student.lastName}`.trim()
      return `• ${student.studentNo} — ${name} (${student.status}, failing subjects: ${entry.failingCount})`
    })
    return [header, ...lines].join("\n")
  }

  if (tool === "list_student_names") {
    if (!result.students?.length) {
      return "I could not find any student names right now. Want me to try again?"
    }
    const header = `Here are the student names (${result.students.length}).`
    const lines = result.students.map(
      (student: any) => `• ${student.studentNo} — ${student.firstName} ${student.lastName}`
    )
    return [header, ...lines].join("\n")
  }

  if (tool === "list_failing_students") {
    if (!result.failing?.length) {
      return "Good news — I do not see any failing grades right now."
    }
    const header = `Here are the students with failing grades (${result.failing.length}). Want full details for anyone?`
    const lines = result.failing.flatMap((entry: any) => {
      const name = `${entry.student.firstName} ${entry.student.lastName}`.trim()
      const intro = `• ${entry.student.studentNo} — ${name} (${entry.subjects.length} failing subjects)`
      const subjects = entry.subjects.map(
        (subject: any) => `   - ${subject.subjectCode} ${subject.subjectTitle}: ${subject.grade} (${subject.equivalent})`
      )
      return [intro, ...subjects]
    })
    return [header, ...lines].join("\n")
  }

  if (tool === "list_passing_students") {
    if (!result.passing?.length) {
      return "I could not find any passing grades right now."
    }
    const header = `Here are the students with passing grades (${result.passing.length}). Want a full grade list for anyone?`
    const lines = result.passing.flatMap((entry: any) => {
      const name = `${entry.student.firstName} ${entry.student.lastName}`.trim()
      const intro = `• ${entry.student.studentNo} — ${name} (${entry.subjects.length} passing subjects)`
      const subjects = entry.subjects.map(
        (subject: any) => `   - ${subject.subjectCode} ${subject.subjectTitle}: ${subject.grade} (${subject.equivalent})`
      )
      return [intro, ...subjects]
    })
    return [header, ...lines].join("\n")
  }

  if (tool === "get_student_grades") {
    if (!result.student) {
      if (result.matches?.length) {
        const options = result.matches
          .map((match: any) => `• ${match.studentNo} — ${match.firstName} ${match.lastName}`)
          .join("\n")
        return [
          "I found multiple students with that name. Which one do you want?",
          options,
        ].join("\n")
      }
      return "I could not find that student. Can you share the student number?"
    }
    const name = `${result.student.firstName} ${result.student.lastName}`.trim()
    const header = `Here are the grades for ${name} (${result.student.studentNo}).`
    const lines = (result.grades || []).map(
      (grade: any) => `• ${grade.subjectCode} ${grade.subjectTitle}: ${grade.grade} (${grade.equivalent})`
    )
    return [header, ...lines].join("\n")
  }

  if (tool === "list_document_requests") {
    if (!result.requests?.length) {
      return "I do not see any document requests right now."
    }
    const header = `Here are the latest document requests (${result.requests.length}).`
    const lines = result.requests.map((request: any) => {
      const name = `${request.student.firstName} ${request.student.lastName}`.trim()
      return `• ${request.referenceNo} — ${request.type} (${request.status}) for ${name} (${request.student.studentNo})`
    })
    return [header, ...lines].join("\n")
  }

  if (tool === "get_student_requests") {
    if (!result.student) {
      if (result.matches?.length) {
        const options = result.matches
          .map((match: any) => `• ${match.studentNo} — ${match.firstName} ${match.lastName}`)
          .join("\n")
        return [
          "I found multiple students with that name. Which one do you want?",
          options,
        ].join("\n")
      }
      return "I could not find that student. Can you share the student number?"
    }
    const name = `${result.student.firstName} ${result.student.lastName}`.trim()
    if (!result.requests?.length) {
      return `I do not see any document requests yet for ${name} (${result.student.studentNo}).`
    }
    const header = `Here are the document requests for ${name} (${result.student.studentNo}).`
    const lines = result.requests.map(
      (request: any) => `• ${request.referenceNo} — ${request.type} (${request.status})`
    )
    return [header, ...lines].join("\n")
  }

  return "No summary available."
}
