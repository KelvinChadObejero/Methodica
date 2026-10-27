import { mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Workspace } from "./domain.js";
import { initialWorkspace } from "./seed.js";

// Local development adapter. Replace with a database before multi-instance hosting.
// Synchronous transactions serialize reads/writes within this one Node process.
export class FileStore {
  constructor(private readonly file: string) {}

  read(): Workspace {
    let raw: string;
    try {
      raw = readFileSync(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return initialWorkspace();
      throw error;
    }
    const data = JSON.parse(raw) as Workspace;
    if (
      data.version !== 1 ||
      !Array.isArray(data.flows) ||
      !Array.isArray(data.sessions) ||
      !Array.isArray(data.templates)
    ) {
      throw new Error("Unsupported workspace file. Restore a valid backup before continuing.");
    }
    return data;
  }

  update<T>(change: (data: Workspace) => T): T {
    const data = this.read();
    const result = change(data);
    mkdirSync(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify(data, null, 2), { encoding: "utf8", flag: "wx" });
      renameSync(temporary, this.file);
    } finally {
      rmSync(temporary, { force: true });
    }
    return result;
  }
}
