const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

let prisma;

const loadEnvLocal = () => {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

const getRequired = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const main = async () => {
  loadEnvLocal();
  prisma = new PrismaClient();
  const email = getRequired("ADMIN_EMAIL").toLowerCase().trim();
  const password = getRequired("ADMIN_PASSWORD");
  const firstName = getRequired("ADMIN_FIRST_NAME").trim();
  const lastName = getRequired("ADMIN_LAST_NAME").trim();
  const role = (process.env.ADMIN_ROLE || "superadmin").trim();

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists for ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.admin.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role,
      },
    });

    console.log(`Admin created for ${email}`);
  }

  const studentPassword = "password123";
  const studentPasswordHash = await bcrypt.hash(studentPassword, 10);
  const sampleStudents = [
    {
      studentNo: "2024-100001",
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan.delacruz@student.hau.edu.ph",
      course: "BS Computer Science",
      yearLevel: "1st Year",
    },
    {
      studentNo: "2024-100002",
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.santos@student.hau.edu.ph",
      course: "BS Information Technology",
      yearLevel: "2nd Year",
    },
    {
      studentNo: "2024-100003",
      firstName: "Paolo",
      lastName: "Garcia",
      email: "paolo.garcia@student.hau.edu.ph",
      course: "BS Computer Engineering",
      yearLevel: "3rd Year",
    },
    {
      studentNo: "2024-100004",
      firstName: "Anne",
      lastName: "Reyes",
      email: "anne.reyes@student.hau.edu.ph",
      course: "BS Information Systems",
      yearLevel: "1st Year",
    },
    {
      studentNo: "2024-100005",
      firstName: "Miguel",
      lastName: "Torres",
      email: "miguel.torres@student.hau.edu.ph",
      course: "BS Data Science",
      yearLevel: "4th Year",
    },
    {
      studentNo: "2024-100006",
      firstName: "Lea",
      lastName: "Cruz",
      email: "lea.cruz@student.hau.edu.ph",
      course: "BS Computer Science",
      yearLevel: "2nd Year",
    },
    {
      studentNo: "2024-100007",
      firstName: "Carlo",
      lastName: "Aquino",
      email: "carlo.aquino@student.hau.edu.ph",
      course: "BS Information Technology",
      yearLevel: "3rd Year",
    },
    {
      studentNo: "2024-100008",
      firstName: "Jasmine",
      lastName: "Lopez",
      email: "jasmine.lopez@student.hau.edu.ph",
      course: "BS Computer Engineering",
      yearLevel: "4th Year",
    },
    {
      studentNo: "2024-100009",
      firstName: "Mark",
      lastName: "Valdez",
      email: "mark.valdez@student.hau.edu.ph",
      course: "BS Information Systems",
      yearLevel: "2nd Year",
    },
    {
      studentNo: "2024-100010",
      firstName: "Elise",
      lastName: "Navarro",
      email: "elise.navarro@student.hau.edu.ph",
      course: "BS Data Science",
      yearLevel: "1st Year",
    },
  ];

  for (const student of sampleStudents) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ studentNo: student.studentNo }, { email: student.email }],
      },
      select: { id: true },
    });
    if (existingStudent) {
      continue;
    }
    await prisma.student.create({
      data: {
        studentNo: student.studentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        course: student.course,
        yearLevel: student.yearLevel,
        passwordHash: studentPasswordHash,
        status: "Active",
      },
    });
  }

  console.log("Sample students seeded (password: password123)");
};

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
