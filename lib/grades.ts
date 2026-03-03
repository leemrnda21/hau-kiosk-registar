import { prisma } from "@/lib/prisma"
import { gradeSubjects } from "@/lib/grade-subjects"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

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

const weightedPick = (rand: () => number, buckets: Array<{ min: number; max: number; weight: number }>) => {
  const total = buckets.reduce((sum, bucket) => sum + bucket.weight, 0)
  let pick = rand() * total
  for (const bucket of buckets) {
    pick -= bucket.weight
    if (pick <= 0) {
      return bucket
    }
  }
  return buckets[buckets.length - 1]
}

const generateGradeValue = (rand: () => number) => {
  const bucket = weightedPick(rand, [
    { min: 85, max: 95, weight: 0.5 },
    { min: 75, max: 84, weight: 0.35 },
    { min: 65, max: 74, weight: 0.15 },
  ])
  const value = Math.round(bucket.min + (bucket.max - bucket.min) * rand())
  return clamp(value, 60, 98)
}

export const getEquivalent = (grade: number) => {
  if (grade <= 74) return "5.00"
  if (grade === 75) return "3.00"
  if (grade <= 79) return "2.75"
  if (grade <= 83) return "2.50"
  if (grade <= 87) return "2.25"
  if (grade <= 91) return "2.00"
  if (grade <= 95) return "1.75"
  return "1.50"
}

const buildGradesForStudent = (studentNo: string) => {
  const rand = createSeededRandom(studentNo)
  return gradeSubjects.map((subject) => {
    const grade = generateGradeValue(rand)
    return {
      subjectCode: subject.subjectCode,
      subjectTitle: subject.subjectTitle,
      units: subject.units,
      grade,
      equivalent: getEquivalent(grade),
    }
  })
}

export const ensureStudentGrades = async (studentId: string, studentNo: string) => {
  const existingCount = await prisma.grade.count({
    where: { studentId },
  })
  if (existingCount > 0) {
    return
  }

  const grades = buildGradesForStudent(studentNo).map((grade) => ({
    ...grade,
    studentId,
  }))

  await prisma.grade.createMany({ data: grades })
}

export const backfillGradesForAllStudents = async () => {
  const students = await prisma.student.findMany({
    select: { id: true, studentNo: true },
  })

  for (const student of students) {
    await ensureStudentGrades(student.id, student.studentNo)
  }
}
