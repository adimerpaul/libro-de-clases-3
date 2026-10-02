-- CreateTable
CREATE TABLE "family_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "guardianName" TEXT,
    "guardianRelation" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "guardianOccupation" TEXT,
    "substituteName" TEXT,
    "substituteRelation" TEXT,
    "substitutePhone" TEXT,
    "substituteOccupation" TEXT,
    "address" TEXT,
    "commune" TEXT,
    "region" TEXT,
    "livesWith" TEXT,
    "health" TEXT,
    "healthInsurance" TEXT,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "pie" BOOLEAN NOT NULL DEFAULT false,
    "emergencyPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "family_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "family_records_studentId_key" ON "family_records"("studentId");
