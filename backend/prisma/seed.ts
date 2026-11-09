import "dotenv/config";
import { createDatabase, seedStudyTypes } from "../src/database.js";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before seeding the catalog.");
const db = createDatabase(process.env.DATABASE_URL);
try {
  await db.$transaction((tx) => seedStudyTypes(tx));
  console.log("StudyType catalog seeded. No accounts or study records were changed.");
} finally {
  await db.$disconnect();
}
