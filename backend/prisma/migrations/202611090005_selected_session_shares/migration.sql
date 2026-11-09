CREATE TABLE "SessionShare" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "includeReflection" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionShare_distinct_accounts" CHECK ("ownerId" <> "recipientId"),
  CONSTRAINT "SessionShare_session_fkey" FOREIGN KEY ("ownerId","sessionId") REFERENCES "StudySession"("userId","id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionShare_recipient_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SessionShare_ownerId_sessionId_recipientId_key" ON "SessionShare"("ownerId","sessionId","recipientId");
CREATE INDEX "SessionShare_recipientId_createdAt_id_idx" ON "SessionShare"("recipientId","createdAt","id");
