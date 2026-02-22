export type DocumentType =
  | "Transcript of Records"
  | "Certificate of Good Moral Character"
  | "Diploma"
  | "Certificate of Enrollment"
  | "Certificate of Grades"
  | "Honorable Dismissal"
  | "Certificate of Transfer Credential"
  | "Certificate of Graduation"

export type DocumentStatus = "ready" | "processing" | "pending" | "submitted" | "rejected"

export interface DemoDocument {
  id: string
  type: DocumentType
  status: DocumentStatus
  requestDate: string
  completionDate?: string
  studentInfo: {
    name: string
    studentId: string
    program: string
    yearLevel?: string
    academicYear?: string
  }
  details?: {
    gpa?: number
    units?: number
    semester?: string
    graduationDate?: string
  }
}

export const demoDocuments: DemoDocument[] = [
  {
    id: "DOC-2024-001",
    type: "Transcript of Records",
    status: "ready",
    requestDate: "2024-01-15",
    completionDate: "2024-01-18",
    studentInfo: {
      name: "Juan Dela Cruz",
      studentId: "2021-00001",
      program: "Bachelor of Science in Computer Science",
      yearLevel: "4th Year",
      academicYear: "2023-2024",
    },
    details: {
      gpa: 3.75,
      units: 150,
      semester: "1st Semester",
    },
  },
  {
    id: "DOC-2024-002",
    type: "Certificate of Good Moral Character",
    status: "ready",
    requestDate: "2024-01-16",
    completionDate: "2024-01-17",
    studentInfo: {
      name: "Maria Santos",
      studentId: "2020-00234",
      program: "Bachelor of Science in Nursing",
      yearLevel: "3rd Year",
      academicYear: "2023-2024",
    },
  },
  {
    id: "DOC-2024-003",
    type: "Diploma",
    status: "ready",
    requestDate: "2024-01-10",
    completionDate: "2024-01-20",
    studentInfo: {
      name: "Pedro Reyes",
      studentId: "2019-00567",
      program: "Bachelor of Science in Business Administration",
      academicYear: "2023-2024",
    },
    details: {
      graduationDate: "March 2024",
      gpa: 3.85,
    },
  },
  {
    id: "DOC-2024-004",
    type: "Certificate of Enrollment",
    status: "ready",
    requestDate: "2024-01-20",
    completionDate: "2024-01-21",
    studentInfo: {
      name: "Ana Garcia",
      studentId: "2022-00890",
      program: "Bachelor of Science in Psychology",
      yearLevel: "2nd Year",
      academicYear: "2023-2024",
    },
    details: {
      units: 21,
      semester: "2nd Semester",
    },
  },
  {
    id: "DOC-2024-005",
    type: "Certificate of Grades",
    status: "ready",
    requestDate: "2024-01-22",
    completionDate: "2024-01-23",
    studentInfo: {
      name: "Carlos Mendoza",
      studentId: "2021-00456",
      program: "Bachelor of Science in Civil Engineering",
      yearLevel: "3rd Year",
      academicYear: "2023-2024",
    },
    details: {
      gpa: 3.5,
      semester: "1st Semester",
    },
  },
  {
    id: "DOC-2024-006",
    type: "Honorable Dismissal",
    status: "ready",
    requestDate: "2024-01-25",
    completionDate: "2024-01-28",
    studentInfo: {
      name: "Sofia Ramos",
      studentId: "2020-00789",
      program: "Bachelor of Science in Accountancy",
      yearLevel: "4th Year",
      academicYear: "2023-2024",
    },
    details: {
      gpa: 3.6,
    },
  },
  {
    id: "DOC-2024-007",
    type: "Certificate of Transfer Credential",
    status: "processing",
    requestDate: "2024-01-30",
    studentInfo: {
      name: "Miguel Torres",
      studentId: "2022-00123",
      program: "Bachelor of Science in Information Technology",
      yearLevel: "2nd Year",
      academicYear: "2023-2024",
    },
  },
  {
    id: "DOC-2024-008",
    type: "Certificate of Graduation",
    status: "ready",
    requestDate: "2024-02-01",
    completionDate: "2024-02-05",
    studentInfo: {
      name: "Isabella Cruz",
      studentId: "2019-00345",
      program: "Bachelor of Science in Architecture",
      academicYear: "2023-2024",
    },
    details: {
      graduationDate: "March 2024",
      gpa: 3.92,
    },
  },
  {
    id: "DOC-2024-009",
    type: "Transcript of Records",
    status: "pending",
    requestDate: "2024-02-03",
    studentInfo: {
      name: "Gabriel Flores",
      studentId: "2021-00678",
      program: "Bachelor of Science in Electrical Engineering",
      yearLevel: "3rd Year",
      academicYear: "2023-2024",
    },
  },
  {
    id: "DOC-2024-010",
    type: "Certificate of Good Moral Character",
    status: "ready",
    requestDate: "2024-02-05",
    completionDate: "2024-02-06",
    studentInfo: {
      name: "Sophia Alvarez",
      studentId: "2022-00234",
      program: "Bachelor of Science in Biology",
      yearLevel: "2nd Year",
      academicYear: "2023-2024",
    },
  },
]

export function getDocumentsByStatus(status: DocumentStatus): DemoDocument[] {
  return demoDocuments.filter((doc) => doc.status === status)
}

export function getDocumentById(id: string): DemoDocument | undefined {
  return demoDocuments.find((doc) => doc.id === id)
}

export function getDocumentsByType(type: DocumentType): DemoDocument[] {
  return demoDocuments.filter((doc) => doc.type === type)
}
