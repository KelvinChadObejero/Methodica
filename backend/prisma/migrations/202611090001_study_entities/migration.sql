-- CreateEnum
CREATE TYPE "FlowKind" AS ENUM ('flow', 'template');

-- CreateEnum
CREATE TYPE "BlockKind" AS ENUM ('focus', 'break', 'review', 'recall');

-- CreateEnum
CREATE TYPE "StudySessionStatus" AS ENUM ('completed', 'stopped');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "normalizedDigest" TEXT;

-- CreateTable
CREATE TABLE "StudyType" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BlockKind" NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "suggestedMinutes" INTEGER NOT NULL,
    "sources" JSONB NOT NULL,
    "evidenceNote" TEXT,

    CONSTRAINT "StudyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyFlow" (
    "userId" TEXT NOT NULL,
    "kind" "FlowKind" NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceTemplateId" TEXT,
    "author" TEXT,

    CONSTRAINT "StudyFlow_pkey" PRIMARY KEY ("userId","kind","id")
);

-- CreateTable
CREATE TABLE "StudyBlock" (
    "userId" TEXT NOT NULL,
    "flowKind" "FlowKind" NOT NULL,
    "flowId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BlockKind" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "studyTypeId" TEXT,

    CONSTRAINT "StudyBlock_pkey" PRIMARY KEY ("userId","flowKind","flowId","id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "flowId" TEXT NOT NULL,
    "flowTitle" TEXT NOT NULL,
    "flowTag" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" DOUBLE PRECISION NOT NULL,
    "focusMinutes" DOUBLE PRECISION NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "StudySessionStatus" NOT NULL,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("userId","id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionTitle" TEXT NOT NULL,
    "sessionSubtitle" TEXT NOT NULL,
    "comprehension" INTEGER NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("userId","sessionId")
);

-- CreateIndex
CREATE INDEX "StudyFlow_userId_kind_position_idx" ON "StudyFlow"("userId", "kind", "position");

-- CreateIndex
CREATE INDEX "StudyBlock_studyTypeId_idx" ON "StudyBlock"("studyTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyBlock_userId_flowKind_flowId_position_key" ON "StudyBlock"("userId", "flowKind", "flowId", "position");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_subject_idx" ON "StudySession"("userId", "subject");

-- AddForeignKey
ALTER TABLE "StudyFlow" ADD CONSTRAINT "StudyFlow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyBlock" ADD CONSTRAINT "StudyBlock_userId_flowKind_flowId_fkey" FOREIGN KEY ("userId", "flowKind", "flowId") REFERENCES "StudyFlow"("userId", "kind", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyBlock" ADD CONSTRAINT "StudyBlock_studyTypeId_fkey" FOREIGN KEY ("studyTypeId") REFERENCES "StudyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_sessionId_fkey" FOREIGN KEY ("userId", "sessionId") REFERENCES "StudySession"("userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business invariants also apply to direct database writes.
ALTER TABLE "StudyType" ADD CONSTRAINT "StudyType_duration_check" CHECK ("suggestedMinutes" BETWEEN 1 AND 120);
ALTER TABLE "StudyFlow" ADD CONSTRAINT "StudyFlow_position_check" CHECK ("position" >= 0);
ALTER TABLE "StudyFlow" ADD CONSTRAINT "StudyFlow_author_check" CHECK (("kind" = 'template' AND "author" IS NOT NULL) OR ("kind" = 'flow' AND "author" IS NULL));
ALTER TABLE "StudyBlock" ADD CONSTRAINT "StudyBlock_bounds_check" CHECK ("position" >= 0 AND "durationMinutes" BETWEEN 1 AND 120);
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_bounds_check" CHECK ("position" >= 0 AND "durationMinutes" BETWEEN 0.016666666666666666 AND 480 AND "focusMinutes" >= 0 AND "focusMinutes" <= "durationMinutes");
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_ratings_check" CHECK ("comprehension" BETWEEN 1 AND 5 AND "fatigue" BETWEEN 1 AND 5 AND length("notes") <= 5000);
