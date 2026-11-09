import type { PrismaClient, Prisma } from "./generated/prisma/client.js";
import { AccountWorkspace, sessionFromRow } from "./database.js";
import type {
  SessionGrant,
  SharedSessionDetail,
  SharedSessionPage,
  SharingProfile,
} from "./share-types.js";
import { WorkspaceImportError } from "./workspace-import.js";

export function sharingCode(id: string) {
  return `mth_${id}`;
}
function decodeCode(code: unknown) {
  if (typeof code !== "string" || !/^mth_[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(code.trim()))
    throw new WorkspaceImportError("Enter the account code your mentor gave you.");
  return code.trim().slice(4);
}
function missing() {
  return new WorkspaceImportError("Session not found.", 404);
}
type GrantRow = Prisma.SessionShareGetPayload<{
  include: { recipient: { select: { id: true; name: true } } };
}>;
function grant(row: GrantRow): SessionGrant {
  return {
    id: row.id,
    recipient: { code: sharingCode(row.recipient.id), name: row.recipient.name },
    includeReflection: row.includeReflection,
    createdAt: row.createdAt.toISOString(),
  };
}

// Permissions live outside workspace backups. Imports cannot grant access.
export class SessionSharing {
  private workspace: AccountWorkspace;
  constructor(
    private db: PrismaClient,
    private accountId: string
  ) {
    this.workspace = new AccountWorkspace(db, accountId);
  }

  async profile(): Promise<SharingProfile> {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: this.accountId },
      select: { name: true },
    });
    return { code: sharingCode(this.accountId), name: user.name };
  }
  async lookup(code: unknown): Promise<SharingProfile> {
    const id = decodeCode(code);
    if (id === this.accountId) throw new WorkspaceImportError("Use another person's account code.");
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!user)
      throw new WorkspaceImportError(
        "That account code is not available. Confirm it with your mentor.",
        404
      );
    return { code: sharingCode(user.id), name: user.name };
  }
  private async owned(tx: Prisma.TransactionClient, sessionId: string) {
    if (
      !(await tx.studySession.findUnique({
        where: { userId_id: { userId: this.accountId, id: sessionId } },
        select: { id: true },
      }))
    )
      throw missing();
  }
  async ownGrants(sessionId: string): Promise<SessionGrant[]> {
    return this.workspace.withAccountLock(async (tx) => {
      await this.owned(tx, sessionId);
      const rows = await tx.sessionShare.findMany({
        where: { ownerId: this.accountId, sessionId },
        include: { recipient: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return rows.map(grant);
    });
  }
  async share(sessionId: string, code: unknown, includeReflection: boolean): Promise<SessionGrant> {
    const recipientId = decodeCode(code);
    if (recipientId === this.accountId)
      throw new WorkspaceImportError("Use another person's account code.");
    return this.workspace.withAccountLock(async (tx) => {
      await this.owned(tx, sessionId);
      if (!(await tx.user.findUnique({ where: { id: recipientId }, select: { id: true } })))
        throw new WorkspaceImportError(
          "That account code is not available. Confirm it with your mentor.",
          404
        );
      const key = { ownerId: this.accountId, sessionId, recipientId };
      const existing = await tx.sessionShare.findUnique({
        where: { ownerId_sessionId_recipientId: key },
      });
      if (
        !existing &&
        ((await tx.sessionShare.count({ where: { ownerId: this.accountId, sessionId } })) >= 5 ||
          (await tx.sessionShare.count({ where: { ownerId: this.accountId } })) >= 100)
      )
        throw new WorkspaceImportError(
          "Sharing limit reached (5 people per session, 100 active shares per account). Revoke an unused share first.",
          409
        );
      const row = await tx.sessionShare.upsert({
        where: { ownerId_sessionId_recipientId: key },
        create: { ...key, includeReflection },
        update: { includeReflection },
        include: { recipient: { select: { id: true, name: true } } },
      });
      return grant(row);
    });
  }
  async update(sessionId: string, id: string, includeReflection: boolean): Promise<SessionGrant> {
    return this.workspace.withAccountLock(async (tx) => {
      await this.owned(tx, sessionId);
      const changed = await tx.sessionShare.updateMany({
        where: { id, ownerId: this.accountId, sessionId },
        data: { includeReflection },
      });
      if (!changed.count) throw missing();
      return grant(
        await tx.sessionShare.findUniqueOrThrow({
          where: { id },
          include: { recipient: { select: { id: true, name: true } } },
        })
      );
    });
  }
  async revoke(sessionId: string, id: string) {
    return this.workspace.withAccountLock(async (tx) => {
      await this.owned(tx, sessionId);
      const result = await tx.sessionShare.deleteMany({
        where: { id, ownerId: this.accountId, sessionId },
      });
      if (!result.count) throw missing();
    });
  }
  async received(offset = 0): Promise<SharedSessionPage> {
    const where = { recipientId: this.accountId };
    const rows = await this.db.sessionShare.findMany({
      where,
      skip: offset,
      take: 25,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        session: {
          select: {
            flowTitle: true,
            subject: true,
            startedAt: true,
            focusMinutes: true,
            timingSource: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    const total = await this.db.sessionShare.count({ where });
    return {
      items: rows.map((row) => ({
        id: row.id,
        ownerName: row.session.user.name,
        createdAt: row.createdAt.toISOString(),
        includeReflection: row.includeReflection,
        title: row.session.flowTitle,
        subject: row.session.subject,
        startedAt: row.session.startedAt.toISOString(),
        focusMinutes: row.session.focusMinutes,
        ...(row.session.timingSource === "legacy-estimate"
          ? { timingSource: "legacy-estimate" as const }
          : {}),
      })),
      total,
      nextOffset: offset + rows.length < total ? offset + rows.length : null,
    };
  }
  async receivedSession(id: string): Promise<SharedSessionDetail> {
    // Check the recipient on every read, including an already-open detail view.
    const row = await this.db.sessionShare.findFirst({
      where: { id, recipientId: this.accountId },
    });
    if (!row) throw new WorkspaceImportError("This session is no longer shared with you.", 404);
    const record = await this.db.studySession.findUnique({
      where: { userId_id: { userId: row.ownerId, id: row.sessionId } },
      include: { log: row.includeReflection, user: { select: { name: true } } },
    });
    if (!record) throw new WorkspaceImportError("This session is no longer shared with you.", 404);
    const serialized = sessionFromRow({
      ...record,
      log: row.includeReflection ? record.log : null,
    });
    const session: SharedSessionDetail["session"] = {
      flowTitle: serialized.flowTitle,
      flowTag: serialized.flowTag,
      subject: serialized.subject,
      startedAt: serialized.startedAt,
      durationMinutes: serialized.durationMinutes,
      focusMinutes: serialized.focusMinutes,
      status: serialized.status,
      ...(serialized.blocks ? { blocks: serialized.blocks } : {}),
      ...(serialized.execution ? { execution: serialized.execution } : {}),
      ...(serialized.timingSource ? { timingSource: serialized.timingSource } : {}),
      ...(row.includeReflection && serialized.reflection
        ? { reflection: serialized.reflection }
        : {}),
    };
    return {
      id: row.id,
      ownerName: record.user.name,
      includeReflection: row.includeReflection,
      session,
    };
  }
}
