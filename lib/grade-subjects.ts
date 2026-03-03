export type GradeSubject = {
  subjectCode: string
  subjectTitle: string
  units: number
}

export const gradeSubjects: GradeSubject[] = [
  {
    subjectCode: "CS 101",
    subjectTitle: "Introduction to Computing",
    units: 3,
  },
  {
    subjectCode: "CS 102",
    subjectTitle: "Programming Fundamentals",
    units: 3,
  },
  {
    subjectCode: "MATH 121",
    subjectTitle: "Calculus I",
    units: 4,
  },
  {
    subjectCode: "ENG 101",
    subjectTitle: "Academic Writing",
    units: 3,
  },
  {
    subjectCode: "CS 201",
    subjectTitle: "Data Structures",
    units: 3,
  },
  {
    subjectCode: "CS 202",
    subjectTitle: "Object-Oriented Programming",
    units: 3,
  },
  {
    subjectCode: "STAT 101",
    subjectTitle: "Probability & Statistics",
    units: 3,
  },
  {
    subjectCode: "HIST 201",
    subjectTitle: "Philippine History",
    units: 3,
  },
]
