import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";
import type {
  StudyBlock,
  SessionExecution,
  SessionLog,
  StudyFlow,
  StudyFlowTemplate,
  Workspace,
} from "./domain.js";
import { initialWorkspace, studyTypes } from "./seed.js";
import { canonical, WorkspaceImportError } from "./workspace-import.js";

import type { HistoryQuery, HistoryPage } from "./history.js";
import {
  dateKey,
  reportDaily,
  streakFor,
  type ReportQuery,
  type StudyReport,
} from "./reporting.js";

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

async function readStudyData(tx: Transaction, userId: string, recent?: number): Promise<Workspace> {
  const flows = await tx.studyFlow.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  const sessions = await tx.studySession.findMany({
    where: { userId },
    orderBy: recent
      ? [{ startedAt: "desc" }, { id: "desc" }]
      : [{ position: "asc" }, { id: "asc" }],
    ...(recent ? { take: recent } : {}),
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
    sessions: sessions.map(sessionFromRow),
  };
}

function sessionFromRow(
  row: Prisma.StudySessionGetPayload<{ include: { log: true } }>
): SessionLog {
  return {
    id: row.id,
    flowId: row.flowId,
    flowTitle: row.flowTitle,
    flowTag: row.flowTag,
    startedAt: row.startedAt.toISOString(),
    durationMinutes: row.durationMinutes,
    focusMinutes: row.focusMinutes,
    subject: row.subject,
    status: row.status,
    ...(row.timingSource === "legacy-estimate" ? { timingSource: "legacy-estimate" as const } : {}),
    ...(row.blocks === null ? {} : { blocks: row.blocks as unknown as StudyBlock[] }),
    ...(row.execution === null ? {} : { execution: row.execution as unknown as SessionExecution }),
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
    timingSource: session.timingSource ?? null,
    blocks: session.blocks ? (session.blocks as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    execution: session.execution
      ? (session.execution as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
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
  const additions: { session: SessionLog; position: number }[] = [];
  for (const [position, session] of data.sessions.entries()) {
    const old = oldSessions.get(session.id);
    if (!old) {
      additions.push({ session, position });
      continue;
    }
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
  // Backup imports can introduce thousands of sessions. Batch their inserts
  // instead of making two database round trips for every new session.
  if (additions.length) {
    await tx.studySession.createMany({
      data: additions.map(({ session, position }) => ({
        userId,
        ...sessionRecord(session, position),
      })),
    });
    const logs = additions.flatMap(({ session }) =>
      session.reflection ? [{ userId, sessionId: session.id, ...session.reflection }] : []
    );
    if (logs.length) await tx.sessionLog.createMany({ data: logs });
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

  // Avoid reading/hash-checking the compatibility JSON on every history page.
  // A row lock also keeps items, counts, and revision in one coherent snapshot.
  private async query<T>(read: (tx: Transaction, revision: number) => Promise<T>) {
    await this.initialize();
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "userId" FROM "Workspace" WHERE "userId" = ${this.userId} FOR UPDATE`;
        let row = await tx.workspace.findUniqueOrThrow({
          where: { userId: this.userId },
          select: { updatedAt: true, normalizedAt: true, revision: true },
        });
        if (!row.normalizedAt || row.normalizedAt.getTime() !== row.updatedAt.getTime()) {
          await this.synchronize(tx);
          const current = await tx.workspace.findUniqueOrThrow({
            where: { userId: this.userId },
            select: { updatedAt: true },
          });
          row = await tx.workspace.update({
            where: { userId: this.userId },
            data: {
              updatedAt: current.updatedAt,
              normalizedAt: current.updatedAt,
              revision: { increment: 1 },
            },
            select: { updatedAt: true, normalizedAt: true, revision: true },
          });
        }
        return read(tx, row.revision);
      },
      { timeout: 15000 }
    );
  }

  async overview() {
    return this.query(async (tx) => readStudyData(tx, this.userId, 25));
  }

  async session(id: string) {
    return this.query(async (tx) => {
      const row = await tx.studySession.findUnique({
        where: { userId_id: { userId: this.userId, id } },
        include: { log: true },
      });
      return row ? sessionFromRow(row) : null;
    });
  }

  async history(query: HistoryQuery): Promise<HistoryPage> {
    return this.query(async (tx, revision) => {
      if (query.revision !== undefined && query.revision !== revision)
        throw new WorkspaceImportError(
          "Your history changed. Return to the first page to see the latest sessions.",
          409
        );
      const search = query.q.replace(/[\\%_]/g, "\\$&");
      const where: Prisma.StudySessionWhereInput = {
        userId: this.userId,
        ...(query.subject ? { subject: query.subject } : {}),
        ...(query.reflected ? { log: { isNot: null } } : {}),
        ...(query.q
          ? {
              OR: [
                { flowTitle: { contains: search, mode: "insensitive" } },
                { subject: { contains: search, mode: "insensitive" } },
                { log: { is: { notes: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      };
      const rows = await tx.studySession.findMany({
        where,
        include: { log: true },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        skip: query.offset,
        take: query.limit,
      });
      const total = await tx.studySession.count({ where });
      const subjects = await tx.$queryRaw<
        { subject: string }[]
      >`SELECT DISTINCT subject FROM "StudySession" WHERE "userId"=${this.userId} ORDER BY subject ASC`;

      const end = query.offset + rows.length;
      return {
        items: rows.map(sessionFromRow),
        total,
        subjects: subjects.map((s) => s.subject),
        nextOffset: end < total ? end : null,
        revision,
      };
    });
  }

  async report(query: ReportQuery): Promise<StudyReport> {
    return this.query(async (tx, revision) => {
      const until = new Date(query.until);
      // startedAt is a UTC TIMESTAMP WITHOUT TIME ZONE. Convert it explicitly
      // before grouping by the requested local calendar date (including DST).
      const totals = await tx.$queryRaw<
        { day: string; minutes: number; count: bigint; completed: bigint; reflections: bigint }[]
      >`
        SELECT to_char((s."startedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${query.timezone}), 'YYYY-MM-DD') AS day,
          SUM(s."focusMinutes")::float8 AS minutes, COUNT(*) AS count,
          COUNT(*) FILTER (WHERE s.status = 'completed') AS completed,
          COUNT(l."sessionId") AS reflections
        FROM "StudySession" s LEFT JOIN "SessionLog" l ON l."userId"=s."userId" AND l."sessionId"=s.id
        WHERE s."userId"=${this.userId} AND s."startedAt" <= ${until}
          AND s."startedAt" >= ((${query.startDay}::date::timestamp AT TIME ZONE ${query.timezone}) AT TIME ZONE 'UTC')
        GROUP BY day`;
      const subjects = await tx.$queryRaw<{ subject: string; minutes: number }[]>`
        SELECT subject, SUM("focusMinutes")::float8 AS minutes FROM "StudySession"
        WHERE "userId"=${this.userId} AND "startedAt" <= ${until}
          AND "startedAt" >= ((${query.startDay}::date::timestamp AT TIME ZONE ${query.timezone}) AT TIME ZONE 'UTC')
        GROUP BY subject ORDER BY minutes DESC, subject ASC`;
      const active = await tx.$queryRaw<{ day: string }[]>`
        SELECT DISTINCT to_char(("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${query.timezone}), 'YYYY-MM-DD') AS day
        FROM "StudySession" WHERE "userId"=${this.userId} AND "focusMinutes">0 AND "startedAt"<=${until}`;
      return {
        ...query,
        revision,
        totalSessions: await tx.studySession.count({ where: { userId: this.userId } }),
        count: totals.reduce((sum, r) => sum + Number(r.count), 0),
        focusMinutes: totals.reduce((sum, r) => sum + r.minutes, 0),
        completed: totals.reduce((sum, r) => sum + Number(r.completed), 0),
        reflections: totals.reduce((sum, r) => sum + Number(r.reflections), 0),
        daily: reportDaily(query, new Map(totals.map((r) => [r.day, r.minutes]))),
        subjects: subjects.map((r) => [r.subject, r.minutes]),
        streak: streakFor(new Set(active.map((r) => r.day)), dateKey(until, query.timezone)),
      };
    });
  }

  async reportSessions(query: ReportQuery, revision: number) {
    return this.query(async (tx, current) => {
      if (current !== revision)
        throw new WorkspaceImportError(
          "Your sessions changed. Refresh the report before exporting.",
          409
        );
      const ids = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "StudySession" WHERE "userId"=${this.userId}
        AND "startedAt"<=${new Date(query.until)}
        AND "startedAt">=((${query.startDay}::date::timestamp AT TIME ZONE ${query.timezone}) AT TIME ZONE 'UTC')`;
      const rows = await tx.studySession.findMany({
        where: { userId: this.userId, id: { in: ids.map((r) => r.id) } },
        include: { log: true },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      });
      return rows.map(sessionFromRow);
    });
  }

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
      // A rollback client cannot serialize fields introduced after its release.
      // Retain only known snapshots for the exact same immutable session core.
      // Never infer old blocks from the current (editable) flow library.
      const known = await tx.studySession.findMany({ where: { userId: this.userId } });
      const byId = new Map(known.map((session) => [session.id, session]));
      for (const session of mirror.sessions) {
        if (!session) continue; // The round-trip check below rejects corrupt rows.
        const old = byId.get(session.id);
        if (
          !old ||
          old.flowId !== session.flowId ||
          old.flowTitle !== session.flowTitle ||
          old.flowTag !== session.flowTag ||
          old.subject !== session.subject ||
          old.startedAt.toISOString() !== session.startedAt ||
          old.durationMinutes !== session.durationMinutes ||
          old.focusMinutes !== session.focusMinutes ||
          old.status !== session.status
        )
          continue;
        if (session.blocks === undefined && old.blocks !== null)
          session.blocks = old.blocks as unknown as StudyBlock[];
        if (session.execution === undefined && old.execution !== null)
          session.execution = old.execution as unknown as SessionExecution;
        if (session.timingSource === undefined && old.timingSource === "legacy-estimate")
          session.timingSource = "legacy-estimate";
      }
      await seedStudyTypes(tx);
      await writeStudyData(tx, this.userId, mirror);
      const restored = await readStudyData(tx, this.userId);
      if (canonical(restored) !== canonical(mirror))
        throw new Error("Study migration did not preserve the existing workspace.");
      const normalizedAt = new Date();
      await tx.workspace.update({
        where: { userId: this.userId },
        data: {
          data: mirror as unknown as Prisma.InputJsonValue,
          updatedAt: normalizedAt,
          normalizedDigest: digest(mirror),
          normalizedAt,
          revision: { increment: 1 },
        },
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
        const normalizedAt = new Date();
        await tx.workspace.update({
          where: { userId: this.userId },
          data: {
            data: data as unknown as Prisma.InputJsonValue,
            normalizedDigest: digest(data),
            updatedAt: normalizedAt,
            normalizedAt,
            revision: { increment: 1 },
          },
        });
        return result;
      },
      { timeout: 15000 }
    );
  }
}
