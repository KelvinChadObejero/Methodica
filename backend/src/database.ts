import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "./generated/prisma/client.js";
import type { Workspace } from "./domain.js";
import { initialWorkspace } from "./seed.js";

export interface WorkspaceStore {
  read(): Promise<Workspace>;
  update<T>(change: (data: Workspace) => T): Promise<T>;
}

export function createDatabase(url: string, maxConnections = 3) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      max: maxConnections,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    }),
  });
}

export class AccountWorkspace implements WorkspaceStore {
  constructor(
    private db: PrismaClient,
    private userId: string
  ) {}

  private async initialize() {
    await this.db.workspace.upsert({
      where: { userId: this.userId },
      create: { userId: this.userId, data: initialWorkspace() as unknown as Prisma.InputJsonValue },
      update: {},
    });
  }

  async read(): Promise<Workspace> {
    await this.initialize();
    const row = await this.db.workspace.findUniqueOrThrow({ where: { userId: this.userId } });
    return row.data as unknown as Workspace;
  }

  async update<T>(change: (data: Workspace) => T): Promise<T> {
    await this.initialize();
    // Row locking serializes concurrent writes across serverless instances.
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "userId" FROM "Workspace" WHERE "userId" = ${this.userId} FOR UPDATE`;
        const row = await tx.workspace.findUniqueOrThrow({ where: { userId: this.userId } });
        const data = row.data as unknown as Workspace;
        const result = change(data);
        await tx.workspace.update({
          where: { userId: this.userId },
          data: { data: data as unknown as Prisma.InputJsonValue },
        });
        return result;
      },
      { timeout: 15000 }
    );
  }
}
