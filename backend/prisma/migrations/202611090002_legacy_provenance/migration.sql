ALTER TABLE "StudySession" ADD COLUMN "timingSource" TEXT;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_legacy_timing_check"
  CHECK ("timingSource" IS NULL OR ("timingSource" = 'legacy-estimate' AND "focusMinutes" = 0 AND "status" = 'stopped'));
