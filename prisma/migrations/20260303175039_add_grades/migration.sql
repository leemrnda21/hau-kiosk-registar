-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "subjectTitle" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,
    "equivalent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grade_grade_idx" ON "Grade"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_studentId_subjectCode_key" ON "Grade"("studentId", "subjectCode");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
