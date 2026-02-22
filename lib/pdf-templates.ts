import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

type StudentProfile = {
  studentNo: string
  firstName: string
  lastName: string
  course?: string | null
  yearLevel?: string | null
  email?: string | null
}

type DocumentRequestData = {
  id: string
  referenceNo: string
  type: string
  requestedAt: Date
  completedAt?: Date | null
  status: string
}

const universityHeader = {
  name: "Holy Angel University",
  address: "#1 Holy Angel St., Angeles City, Pampanga, Philippines",
  office: "Office of the University Registrar",
}

const formatDate = (value: Date | null | undefined) => {
  if (!value) return ""
  return value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

const titleCase = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const buildMockTranscript = () => {
  return [
    { course: "CS 101", title: "Introduction to Computing", units: 3, grade: "1.75", term: "1st Sem" },
    { course: "CS 102", title: "Programming Fundamentals", units: 3, grade: "1.50", term: "1st Sem" },
    { course: "MATH 121", title: "Calculus I", units: 4, grade: "2.00", term: "1st Sem" },
    { course: "ENG 101", title: "Academic Writing", units: 3, grade: "1.75", term: "1st Sem" },
    { course: "CS 201", title: "Data Structures", units: 3, grade: "1.75", term: "2nd Sem" },
    { course: "CS 202", title: "Object-Oriented Programming", units: 3, grade: "1.50", term: "2nd Sem" },
    { course: "STAT 101", title: "Probability & Statistics", units: 3, grade: "2.00", term: "2nd Sem" },
    { course: "HIST 201", title: "Philippine History", units: 3, grade: "1.75", term: "2nd Sem" },
  ]
}

const drawHeader = (page: any, font: any, bold: any, width: number, height: number) => {
  const titleSize = 18
  const subTitleSize = 11
  page.drawText("HAU", { x: 48, y: height - 70, size: 26, font: bold, color: rgb(0.45, 0.07, 0.1) })
  page.drawText(universityHeader.name, { x: 110, y: height - 55, size: titleSize, font: bold })
  page.drawText(universityHeader.address, { x: 110, y: height - 74, size: subTitleSize, font })
  page.drawText(universityHeader.office, { x: 110, y: height - 90, size: subTitleSize, font })
  page.drawLine({
    start: { x: 40, y: height - 110 },
    end: { x: width - 40, y: height - 110 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
}

const drawFooter = (page: any, font: any, width: number) => {
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  page.drawText("Registrar: Maria L. Santos", { x: 40, y: 60, size: 10, font })
  page.drawText("This document is system-generated and valid without signature.", { x: 40, y: 44, size: 9, font })
}

const drawWatermark = (page: any, font: any, width: number, height: number, text: string) => {
  page.drawText(text, {
    x: width / 2 - 120,
    y: height / 2,
    size: 36,
    font,
    color: rgb(0.9, 0.9, 0.9),
    rotate: { type: "degrees", angle: -25 },
  })
}

export async function generateDocumentPdf(student: StudentProfile, request: DocumentRequestData) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  drawHeader(page, font, bold, width, height)
  drawWatermark(page, bold, width, height, "Official Copy")

  const title = titleCase(request.type)
  page.drawText(title, { x: 40, y: height - 150, size: 16, font: bold })

  page.drawText(`Reference No.: ${request.referenceNo}`, { x: 40, y: height - 175, size: 10, font })
  page.drawText(`Requested: ${formatDate(request.requestedAt)}`, { x: 40, y: height - 190, size: 10, font })
  if (request.completedAt) {
    page.drawText(`Completed: ${formatDate(request.completedAt)}`, { x: 40, y: height - 205, size: 10, font })
  }

  const fullName = `${student.firstName} ${student.lastName}`.trim()
  page.drawText(`Student Name: ${fullName}`, { x: 40, y: height - 240, size: 11, font })
  page.drawText(`Student Number: ${student.studentNo}`, { x: 40, y: height - 258, size: 11, font })
  page.drawText(`Program: ${student.course || "N/A"}`, { x: 40, y: height - 276, size: 11, font })
  page.drawText(`Year Level: ${student.yearLevel || "N/A"}`, { x: 40, y: height - 294, size: 11, font })

  if (request.type.includes("transcript")) {
    const rows = buildMockTranscript()
    let currentY = height - 330

    page.drawText("Academic Record Summary", { x: 40, y: currentY, size: 12, font: bold })
    currentY -= 20

    page.drawText("Course", { x: 40, y: currentY, size: 9, font: bold })
    page.drawText("Title", { x: 120, y: currentY, size: 9, font: bold })
    page.drawText("Units", { x: 360, y: currentY, size: 9, font: bold })
    page.drawText("Grade", { x: 420, y: currentY, size: 9, font: bold })
    page.drawText("Term", { x: 480, y: currentY, size: 9, font: bold })
    currentY -= 12

    rows.forEach((row) => {
      page.drawText(row.course, { x: 40, y: currentY, size: 9, font })
      page.drawText(row.title, { x: 120, y: currentY, size: 9, font })
      page.drawText(String(row.units), { x: 365, y: currentY, size: 9, font })
      page.drawText(row.grade, { x: 420, y: currentY, size: 9, font })
      page.drawText(row.term, { x: 480, y: currentY, size: 9, font })
      currentY -= 12
    })

    page.drawText("Total Units: 25", { x: 40, y: currentY - 10, size: 10, font: bold })
    page.drawText("GPA: 1.78", { x: 180, y: currentY - 10, size: 10, font: bold })
  } else {
    const bodyY = height - 330
    const paragraph = `This certifies that ${fullName} (${student.studentNo}) is a bonafide student of ${
      universityHeader.name
    } enrolled in the program ${student.course || "N/A"}, ${student.yearLevel || "N/A"}. This document is issued upon request for official purposes.`

    const lines = paragraph.match(/.{1,90}/g) || [paragraph]
    lines.forEach((line, index) => {
      page.drawText(line.trim(), { x: 40, y: bodyY - index * 16, size: 11, font })
    })
  }

  drawFooter(page, font, width)

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
