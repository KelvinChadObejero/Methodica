ALTER TABLE "Workspace" ADD COLUMN "normalizedAt" TIMESTAMP(3), ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudySession" ADD COLUMN "blocks" JSONB;
CREATE INDEX "StudySession_userId_startedAt_id_idx" ON "StudySession" ("userId", "startedAt" DESC, "id" DESC);

-- Older deployments do not know normalizedAt. Invalidate the fast-read marker
-- even when an older and newer write happen within the same millisecond.
CREATE FUNCTION methodica_invalidate_normalized_marker() RETURNS trigger AS $$
BEGIN
  IF NEW.data IS DISTINCT FROM OLD.data AND NEW."normalizedAt" IS NOT DISTINCT FROM OLD."normalizedAt" THEN
    NEW."normalizedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER workspace_normalized_marker BEFORE UPDATE ON "Workspace"
FOR EACH ROW EXECUTE FUNCTION methodica_invalidate_normalized_marker();
