import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Route modules mirror the ERD entities (see /docs proposal, Section 7.2).
// Each will own its own file under src/routes/ once implemented:
//   /api/auth        -> User (register, login, roles)
//   /api/flows        -> StudyFlow
//   /api/blocks        -> StudyBlock
//   /api/studytypes     -> StudyType
//   /api/sessions       -> StudySession
//   /api/sessions/:id/log -> SessionLog (post-session reflection)
//   /api/community       -> publish/import/rate shared StudyFlow templates
//   /api/analytics       -> aggregated stats for the dashboard
// None are implemented yet — this is a placeholder scaffold so the
// frontend has something to point at while the schema/API contract
// is being finalized.

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "methodica-backend" });
});

// Vercel expects the Express app to be exported, not listened on.
// For local dev, we still listen on a port.
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  app.listen(PORT, () => {
    console.log(`methodica-backend listening on http://localhost:${PORT}`);
  });
}

export default app;
