-- CreateTable
CREATE TABLE "Hike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "distanceMiles" REAL NOT NULL,
    "elevationGainFt" INTEGER NOT NULL,
    "profilePoints" JSONB NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneratedPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hikeId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "segments" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedPlan_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hikeId" TEXT NOT NULL,
    "trainingStartDate" DATETIME NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "settings" JSONB NOT NULL,
    "weeks" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingPlan_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingPlanRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingPlanId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "weeks" JSONB NOT NULL,
    "changeLog" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingPlanRevision_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
