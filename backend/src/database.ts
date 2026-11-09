import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { PrismaClient, type Prisma } from "./generated/prisma/client.js";
import type { SessionLog, StudyFlow, StudyFlowTemplate, Workspace } from "./domain.js";
import { initialWorkspace, studyTypes } from "./seed.js";
import { canonical } from "./workspace-import.js";

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

type Transaction = Prisma.TransactionClient;

export async function seedStudyTypes(db: PrismaClient | Transaction) {
  for (const technique of studyTypes) {
    const fields = {
      ...technique,
      sources: technique.sources ?? [],
      evidenceNote: technique.evidenceNote ?? null,
    };
    await db.studyType.upsert({
      where: { id: technique.id },
      create: fields,
      update: fields,
    });
  }
}

function digest(data: Workspace) {
  return createHash("sha256").update(canonical(data)).digest("hex");
}

async function readStudyData(tx: Transaction, userId: string): Promise<Workspace> {
  const flows = await tx.studyFlow.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  const sessions = await tx.studySession.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { log: true },
  });
  function flow(row: (typeof flows)[number]): StudyFlow {
    return {
      id: row.id,
      title: row.title,
      tag: row.tag,
      totalMinutes: row.blocks.reduce((sum, block) => sum + block.durationMinutes, 0),
      ...(row.sourceTemplateId === null ? {} : { sourceTemplateId: row.sourceTemplateId }),
      blocks: row.blocks.map((block) => ({
        id: block.id,
        title: block.title,
        type: block.type,
        durationMinutes: block.durationMinutes,
        ...(block.studyTypeId === null ? {} : { studyTypeId: block.studyTypeId }),
      })),
    };
  }
  return {
    version: 1,
    flows: flows.filter((row) => row.kind === "flow").map(flow),
    templates: flows
      .filter((row) => row.kind === "template")
      .map((row) => ({ ...flow(row), author: row.author! })),
    sessions: sessions.map((row) => ({
      id: row.id,
      flowId: row.flowId,
      flowTitle: row.flowTitle,
      flowTag: row.flowTag,
      startedAt: row.startedAt.toISOString(),
      durationMinutes: row.durationMinutes,
      focusMinutes: row.focusMinutes,
      subject: row.subject,
      status: row.status,
      hasReflection: row.log !== null,
      ...(row.log
        ? {
            reflection: {
              sessionTitle: row.log.sessionTitle,
              sessionSubtitle: row.log.sessionSubtitle,
              comprehension: row.log.comprehension,
              fatigue: row.log.fatigue,
              notes: row.log.notes,
            },
          }
        : {}),
    })),
  };
}

function sessionRecord(session: SessionLog, position: number) {
  return {
    id: session.id,
    position,
    flowId: session.flowId,
    flowTitle: session.flowTitle,
    flowTag: session.flowTag,
    startedAt: new Date(session.startedAt),
    durationMinutes: session.durationMinutes,
    focusMinutes: session.focusMinutes,
    subject: session.subject,
    status: session.status,
  };
}

// Apply only changed records. The account lock covers all tables and the mirror.
async function writeStudyData(
  tx: Transaction,
  userId: string,
  data: Workspace,
  previous?: Workspace
) {
  if (!previous) {
    // Backfill/import compatibility in batches, including histories at the limit.
    await tx.studyFlow.deleteMany({ where: { userId } });
    await tx.studySession.deleteMany({ where: { userId } });
    const flows = [
      ...data.flows.map((record, position) => ({ record, position, kind: "flow" as const })),
      ...data.templates.map((record, position) => ({
        record,
        position,
        kind: "template" as const,
      })),
    ];
    if (flows.length) {
      await tx.studyFlow.createMany({
        data: flows.map(({ record, position, kind }) => ({
          userId,
          id: record.id,
          kind,
          position,
          title: record.title,
          tag: record.tag,
          sourceTemplateId: record.sourceTemplateId ?? null,
          author: kind === "template" ? (record as StudyFlowTemplate).author : null,
        })),
      });
      await tx.studyBlock.createMany({
        data: flows.flatMap(({ record, kind }) =>
          record.blocks.map((block, position) => ({
            userId,
            flowId: record.id,
            flowKind: kind,
            id: block.id,
            position,
            title: block.title,
            type: block.type,
            durationMinutes: block.durationMinutes,
            studyTypeId: block.studyTypeId ?? null,
          }))
        ),
      });
    }
    if (data.sessions.length) {
      await tx.studySession.createMany({
        data: data.sessions.map((session, position) => ({
          userId,
          ...sessionRecord(session, position),
        })),
      });
      const logs = data.sessions.flatMap((session) =>
        session.reflection ? [{ userId, sessionId: session.id, ...session.reflection }] : []
      );
      if (logs.length) await tx.sessionLog.createMany({ data: logs });
    }
    return;
  }
  for (const kind of ["flow", "template"] as const) {
    const records = kind === "flow" ? data.flows : data.templates;
    const old = kind === "flow" ? previous?.flows : previous?.templates;
    await tx.studyFlow.deleteMany({
      where: { userId, kind, id: { notIn: records.map((record) => record.id) } },
    });
    for (const [position, record] of records.entries()) {
      if (old?.[position] && canonical(old[position]) === canonical(record)) continue;
      const fields = {
        title: record.title,
        tag: record.tag,
        position,
        sourceTemplateId: record.sourceTemplateId ?? null,
        author: kind === "template" ? (record as StudyFlowTemplate).author : null,
      };
      await tx.studyFlow.upsert({
        where: { userId_kind_id: { userId, kind, id: record.id } },
        create: { userId, kind, id: record.id, ...fields },
        update: fields,
      });
      // Replacing only this flow's blocks avoids order collisions during swaps.
      await tx.studyBlock.deleteMany({ where: { userId, flowKind: kind, flowId: record.id } });
      await tx.studyBlock.createMany({
        data: record.blocks.map((block, blockPosition) => ({
          userId,
          flowKind: kind,
          flowId: record.id,
          id: block.id,
          position: blockPosition,
          title: block.title,
          type: block.type,
          durationMinutes: block.durationMinutes,
          studyTypeId: block.studyTypeId ?? null,
        })),
      });
    }
  }
  await tx.studySession.deleteMany({
    where: { userId, id: { notIn: data.sessions.map((session) => session.id) } },
  });
  const oldSessions = new Map(
    previous.sessions.map((session, position) => [session.id, { session, position }])
  );
  const shifts = new Map<number, string[]>();
  for (const [position, session] of data.sessions.entries()) {
    const old = oldSessions.get(session.id);
    if (old && canonical(old.session) === canonical(session)) {
      const delta = position - old.position;
      if (delta) {
        const ids = shifts.get(delta) || [];
        ids.push(session.id);
        shifts.set(delta, ids);
      }
      continue;
    }
    const { reflection } = session;
    const record = sessionRecord(session, position);
    await tx.studySession.upsert({
      where: { userId_id: { userId, id: session.id } },
      create: { userId, ...record },
      update: record,
    });
    if (reflection)
      await tx.sessionLog.upsert({
        where: { userId_sessionId: { userId, sessionId: session.id } },
        create: { userId, sessionId: session.id, ...reflection },
        update: reflection,
      });
    else await tx.sessionLog.deleteMany({ where: { userId, sessionId: session.id } });
  }
  // Prepending a session/import shifts the rest with one SQL statement per offset.
  for (const [delta, ids] of shifts)
    await tx.studySession.updateMany({
      where: { userId, id: { in: ids } },
      data: { position: { increment: delta } },
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

  private async synchronize(tx: Transaction): Promise<Workspace> {
    await tx.$queryRaw`SELECT "userId" FROM "Workspace" WHERE "userId" = ${this.userId} FOR UPDATE`;
    const row = await tx.workspace.findUniqueOrThrow({ where: { userId: this.userId } });
    const mirror = row.data as unknown as Workspace;
    if (row.normalizedDigest !== digest(mirror)) {
      // Backfill once, or reconcile a write made by the previous deployment.
      // Validate without replacing/clearing the original on any error.
      // Stored accounts can exceed the transport limit for device imports and
      // can contain older IDs. Database constraints plus the exact round trip
      // validate conversion without imposing a newer HTTP import policy.
      if (
        !mirror ||
        mirror.version !== 1 ||
        !Array.isArray(mirror.flows) ||
        !Array.isArray(mirror.sessions) ||
        !Array.isArray(mirror.templates)
      )
        throw new Error("Unsupported stored workspace. Existing data was preserved.");
      await seedStudyTypes(tx);
      await writeStudyData(tx, this.userId, mirror);
      const restored = await readStudyData(tx, this.userId);
      if (canonical(restored) !== canonical(mirror))
        throw new Error("Study migration did not preserve the existing workspace.");
      await tx.workspace.update({
        where: { userId: this.userId },
        data: { normalizedDigest: digest(mirror) },
      });
      return restored;
    }
    return readStudyData(tx, this.userId);
  }

  async read(): Promise<Workspace> {
    await this.initialize();
    return this.db.$transaction((tx) => this.synchronize(tx), { timeout: 15000 });
  }

  async update<T>(change: (data: Workspace) => T): Promise<T> {
    await this.initialize();
    return this.db.$transaction(
      async (tx) => {
        const data = await this.synchronize(tx);
        const previous = structuredClone(data);
        const result = change(data);
        await writeStudyData(tx, this.userId, data, previous);
        await tx.workspace.update({
          where: { userId: this.userId },
          data: {
            data: data as unknown as Prisma.InputJsonValue,
            normalizedDigest: digest(data),
          },
        });
        return result;
      },
      { timeout: 15000 }
    );
  }
}
