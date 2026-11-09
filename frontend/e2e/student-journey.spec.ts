import { test, expect, type Dialog, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const password = "class demo study passphrase 2026";
async function reloadAcceptingDialogs(page: Page) {
  const handled: Promise<void>[] = [];
  const accept = (dialog: Dialog) => {
    handled.push(dialog.accept());
  };
  page.on("dialog", accept);
  try {
    await page.reload();
    await Promise.all(handled);
  } finally {
    page.off("dialog", accept);
  }
}
async function register(page: Page, name: string, email: string) {
  await page.goto("/#register");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page
    .locator(".auth-form")
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".account-name")).toHaveText(name);
  await expect(page).toHaveURL(/#dashboard$/);
}
async function login(page: Page, email: string) {
  await page.goto("/#login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator(".auth-form").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator(".workspace-badge")).toHaveText("Saved to your account");
  await expect(page).toHaveURL(/#dashboard$/);
}

function recordNotifications() {
  const native = window.Notification;
  const state = window as unknown as { timerNotices: string[] };
  state.timerNotices = [];
  const wrapped = function (title: string, options?: NotificationOptions) {
    const notice = new native(title, options);
    state.timerNotices.push(title);
    return notice;
  };
  Object.defineProperty(wrapped, "permission", { get: () => native.permission });
  window.Notification = wrapped as unknown as typeof Notification;
  localStorage.setItem("methodica-settings", JSON.stringify({ notifications: true }));
  window.dispatchEvent(new Event("methodica-preferences"));
}

test("student builds, completes two blocks, recovers a failed reflection and reopens on another device", async ({
  page,
  browser,
}, testInfo) => {
  const email = `student-${Date.now()}@example.test`;
  await register(page, "Class student", email);
  await page.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await page.getByLabel("Flow name").fill("Biology class preparation");
  await page.getByLabel("Subject", { exact: true }).fill("Biology");
  await page.getByLabel("Block name", { exact: true }).fill("Practice a problem");
  await page.getByLabel("Minutes", { exact: true }).fill("1");
  await page.getByRole("button", { name: "+ Add study block", exact: true }).click();
  await page.getByLabel("Block name", { exact: true }).nth(1).fill("Recall the solution");
  await page.getByLabel("Minutes", { exact: true }).nth(1).fill("1");
  await page
    .getByRole("button", { name: "Drag block 2", exact: true })
    .dragTo(page.getByRole("listitem").first());
  await expect(page.getByLabel("Block name", { exact: true }).first()).toHaveValue(
    "Recall the solution"
  );
  // The keyboard alternative preserves the same order semantics.
  await page.getByRole("button", { name: "Move block 1 down", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Block name", { exact: true }).first()).toHaveValue(
    "Practice a problem"
  );
  let failSave = true;
  await page.route("**/api/flows", (route) => {
    if (route.request().method() === "POST" && failSave) {
      failSave = false;
      return route.fulfill({ status: 503, json: { message: "Temporary study service failure" } });
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Save flow", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("not available yet");
  const cancelledNavigation = page.waitForEvent("dialog").then((dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await cancelledNavigation;
  await expect(page).toHaveURL(/#builder$/);
  await expect(page.getByLabel("Flow name")).toHaveValue("Biology class preparation");
  await reloadAcceptingDialogs(page);
  await expect(page.getByLabel("Flow name")).toHaveValue("Biology class preparation");
  await expect(page.getByLabel("Block name", { exact: true }).nth(1)).toHaveValue(
    "Recall the solution"
  );
  await page.getByRole("button", { name: "Save flow", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Flow saved" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("saved-builder.png"), fullPage: true });
  const workspace = await (await page.request.get("/api/workspace")).json();
  const flow = workspace.flows.find(
    (item: { title: string }) => item.title === "Biology class preparation"
  );
  expect(flow.blocks.map((block: { studyTypeId: string }) => block.studyTypeId)).toEqual([
    "focus",
    "recall",
  ]);
  await page.getByRole("button", { name: "Study Timer", exact: true }).click();
  await page.getByRole("combobox", { name: "Study flow", exact: true }).selectOption(flow.id);
  await page.context().grantPermissions(["notifications"], { origin: new URL(page.url()).origin });

  await page.addInitScript(recordNotifications);
  await page.evaluate(recordNotifications);
  let sessionPosts = 0;
  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    sessionPosts++;
    if (sessionPosts === 1) {
      const actual = await route.fetch();
      expect(actual.status()).toBe(201);
      return route.fulfill({
        status: 503,
        json: { message: "Success response lost after commit" },
      });
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Start session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await reloadAcceptingDialogs(page);
  await expect(page.getByText(/Your session was recovered and paused/)).toBeVisible();
  expect(await page.evaluate(() => Notification.permission)).toBe("granted");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("methodica-settings")!).notifications)
  ).toBe(true);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const opening = page.waitForEvent("popup");
  await page.evaluate(() => window.open(location.href));
  const duplicate = await opening;
  await expect(duplicate.getByText(/This timer is controlled by another tab/)).toBeVisible();
  await expect(duplicate.getByRole("button", { name: "Resume", exact: true })).toBeDisabled();
  await duplicate.close();
  await page.evaluate(() => {
    const original = Date.now;
    Date.now = () => original() + 3600000;
    Object.assign(window, {
      restoreTimerClock: () => {
        Date.now = original;
      },
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const key = Object.keys(sessionStorage).find((key) =>
          key.startsWith("methodica-account-timer-")
        );
        return key ? JSON.parse(sessionStorage.getItem(key)!).elapsedMs : 0;
      })
    )
    .toBeGreaterThan(1000);
  await page.evaluate(() =>
    (window as unknown as { restoreTimerClock: () => void }).restoreTimerClock()
  );
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  // Real elapsed time, including background/focus changes. No fake timer clock.
  await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible({
    timeout: 130000,
  });
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByText("Session saved.", { exact: true })).toBeVisible();
  expect(sessionPosts).toBe(2);
  expect(
    await page.evaluate(() => (window as unknown as { timerNotices: string[] }).timerNotices.length)
  ).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Add reflection", exact: true }).click();
  const notes = page.getByLabel("What worked? What would you change?");
  await notes.fill("Retrieving the solution helped. Review cell division next.");
  await page.route("**/api/sessions/*/log", (route) =>
    route.fulfill({ status: 503, json: { message: "Temporary reflection failure" } })
  );
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(notes).toHaveValue("Retrieving the solution helped. Review cell division next.");
  await reloadAcceptingDialogs(page);
  await expect(notes).toHaveValue("Retrieving the solution helped. Review cell division next.");
  await page.unroute("**/api/sessions/*/log");
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reflection saved");
  const saved = await (await page.request.get("/api/workspace")).json();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].status).toBe("completed");
  expect(saved.sessions[0].durationMinutes).toBe(2);
  expect(saved.sessions[0].blocks).toEqual(flow.blocks);
  expect(
    saved.sessions[0].execution.blocks.map((block: { outcome: string }) => block.outcome)
  ).toEqual(["completed", "completed"]);
  expect(saved.sessions[0].execution.events).toHaveLength(4);
  expect(saved.sessions[0].reflection.notes).toContain("cell division");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.locator(".account-name")).toHaveCount(0);
  await login(page, email);
  await page.getByRole("button", { name: "Session History", exact: true }).click();
  await page.getByRole("button", { name: "View reflection", exact: true }).click();
  await expect(page.locator(".reflection-detail")).toContainText("cell division");
  await page.getByRole("button", { name: "Edit reflection", exact: true }).click();
  await page
    .getByLabel("What worked? What would you change?")
    .fill("Review cell division next. Updated after re-login.");
  await page.getByRole("button", { name: "Update reflection", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reflection saved");
  const updated = await (await page.request.get("/api/workspace")).json();
  expect(updated.sessions).toHaveLength(1);
  expect(updated.sessions[0].reflection.notes).toContain("Updated after re-login");
  const secondDevice = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const second = await secondDevice.newPage();
  await login(second, email);
  await second.getByRole("button", { name: "Session History", exact: true }).click();
  await second.getByRole("button", { name: "View reflection", exact: true }).click();
  await expect(second.locator(".reflection-detail")).toContainText("cell division");
  await expect(second.locator(".reflection-detail")).toContainText("Updated after re-login");
  expect(
    await second.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
  await second.screenshot({ path: testInfo.outputPath("mobile-history.png"), fullPage: true });
  await second.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await second.getByRole("button", { name: /Biology class preparation.*2 min/ }).click();
  await expect(second.getByLabel("Block name", { exact: true }).first()).toHaveValue(
    "Practice a problem"
  );
  await secondDevice.close();
  const bobContext = await browser.newContext();
  const bob = await bobContext.newPage();
  await register(bob, "Another student", `another-${Date.now()}@example.test`);
  await bob.getByRole("button", { name: "Session History", exact: true }).click();
  await expect(bob.getByRole("heading", { name: "Your story starts here." })).toBeVisible();
  expect((await (await bob.request.get("/api/workspace")).json()).sessions).toHaveLength(0);
  const denied = await bob.request.put(`/api/sessions/${saved.sessions[0].id}/log`, {
    headers: { Origin: new URL(bob.url()).origin },
    data: { comprehension: 1, fatigue: 1, notes: "unauthorized" },
  });
  expect(denied.status()).toBe(404);
  // Explicit selected-session mentor access never becomes library ownership.
  await bob.getByRole("button", { name: "Shared with me", exact: true }).click();
  const mentorCode = await bob.getByLabel("My account code", { exact: true }).inputValue();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Session History", exact: true }).click();
  await page.getByRole("button", { name: "Share session", exact: true }).click();
  const sharing = page.getByRole("region", { name: "Share only this session.", exact: true });
  await sharing.getByLabel("Mentor account code", { exact: true }).fill(mentorCode);
  await sharing.getByRole("button", { name: "Find account", exact: true }).click();
  await expect(sharing.getByText(/Named account:/)).toContainText("Another student");
  await expect(
    sharing.getByRole("button", { name: "Confirm read-only sharing", exact: true })
  ).toBeDisabled();
  await expect(
    sharing.getByLabel("Include reflection notes and ratings, including later updates", {
      exact: true,
    })
  ).not.toBeChecked();
  await sharing.getByLabel("Share only this session with Another student", { exact: true }).check();
  await sharing.getByRole("button", { name: "Confirm read-only sharing", exact: true }).click();
  await expect(sharing.getByRole("status")).toContainText("shared read-only");
  await bob.setViewportSize({ width: 375, height: 812 });
  await bob.getByRole("button", { name: "Refresh shared list", exact: true }).click();
  await bob.getByRole("button", { name: "View shared session", exact: true }).click();
  const shared = bob.getByRole("article", { name: "Read-only shared session", exact: true });
  await expect(
    shared.getByText("Reflection notes and ratings are not shared.", { exact: true })
  ).toBeVisible();
  await expect(shared.getByRole("button", { name: /Edit|Save|Publish|Delete/ })).toHaveCount(0);
  await sharing.getByLabel("Include reflection for Another student", { exact: true }).check();
  await sharing.getByRole("button", { name: "Update access", exact: true }).click();
  await expect(sharing.getByRole("status")).toContainText("permissions updated");
  await bob.getByRole("button", { name: "Refresh shared session", exact: true }).click();
  await expect(shared).toContainText("Updated after re-login");
  expect(
    (
      await bob.request.put(`/api/sessions/${saved.sessions[0].id}/log`, {
        headers: { Origin: new URL(bob.url()).origin },
        data: { comprehension: 1, fatigue: 1, notes: "Still unauthorized" },
      })
    ).status()
  ).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await bob.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-sharing-owner.png"), fullPage: true });
  await bob.screenshot({
    path: testInfo.outputPath("mobile-read-only-mentor.png"),
    fullPage: true,
  });
  await sharing.getByLabel("Include reflection for Another student", { exact: true }).uncheck();
  await sharing.getByRole("button", { name: "Update access", exact: true }).click();
  await expect(sharing.getByRole("status")).toContainText("permissions updated");
  await bob.getByRole("button", { name: "Refresh shared session", exact: true }).click();
  await expect(
    shared.getByText("Reflection notes and ratings are not shared.", { exact: true })
  ).toBeVisible();
  await sharing
    .getByRole("button", { name: "Revoke Another student's access", exact: true })
    .click();
  await expect(sharing.getByRole("status")).toContainText("Access revoked");
  await bob.getByRole("button", { name: "Refresh shared session", exact: true }).click();
  await expect(bob.getByRole("alert")).toContainText("no longer shared");
  await expect(shared).toHaveCount(0);
  await bob.getByRole("button", { name: "Refresh shared list", exact: true }).click();
  await expect(
    bob.getByRole("heading", { name: "No sessions shared yet.", exact: true })
  ).toBeVisible();
  expect((await (await page.request.get("/api/workspace")).json()).sessions).toHaveLength(1);
  await bobContext.close();
});

test("expired-session draft recovery stays with the original account", async ({ page }) => {
  const email = `draft-owner-${Date.now()}@example.test`;
  await register(page, "Draft owner", email);
  await page.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await page.getByLabel("Flow name").fill("Unfinished private physics draft");
  await page.getByLabel("Subject", { exact: true }).fill("Physics");
  await page.route("**/api/flows", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 401, json: { message: "Your session has expired." } })
      : route.continue()
  );
  await page.getByRole("button", { name: "Save flow", exact: true }).click();
  await expect(
    page.getByText("Your session has ended. Log in again to open your saved workspace.", {
      exact: false,
    })
  ).toBeVisible();
  await page.unroute("**/api/flows");
  await login(page, email);
  await page.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await expect(page.getByLabel("Flow name")).toHaveValue("Unfinished private physics draft");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.locator(".account-name")).toHaveCount(0);
  await register(page, "Different draft owner", `draft-other-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await expect(page.getByLabel("Flow name")).toHaveValue("");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await login(page, email);
  await page.getByRole("button", { name: "Flow Builder", exact: true }).click();
  await expect(page.getByLabel("Flow name")).toHaveValue("Unfinished private physics draft");
  await page.getByRole("button", { name: "Save flow", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Flow saved" })).toBeVisible();
});

test("technique sources and quick-load work in a narrow device workspace", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use this device", exact: true }).click();
  await page.getByRole("button", { name: "StudyTypes", exact: true }).click();
  await page.getByLabel("Search techniques").fill("Feynman");
  await page.getByText("Research references", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Chi et al/ })).toHaveAttribute(
    "href",
    "https://doi.org/10.1207/s15516709cog1302_1"
  );
  await page.getByRole("button", { name: "Use this technique →", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Technique", exact: true })).toHaveValue(
    "feynman"
  );
  await page.getByLabel("Flow name").fill("My device flow");
  await page.getByLabel("Subject", { exact: true }).fill("Science");
  await page.getByRole("button", { name: "Save flow", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("mobile-builder.png"), fullPage: true });
});

test("backup and legacy imports require review, preserve sources and safely deduplicate retries", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const email = `backup-${Date.now()}@example.test`;
  await register(page, "Backup student", email);
  await page.getByRole("button", { name: "Workspace Connection", exact: true }).click();
  const area = page.getByRole("region", {
    name: "Import a backup or older sessions.",
    exact: true,
  });
  const preview = await (await page.request.get("/api/preview")).json();
  const source = preview.workspace;
  source.flows = [{ ...source.flows[0], id: "saved-backup-flow", title: "Saved backup flow" }];
  source.sessions = [
    {
      id: "saved-backup-session",
      flowId: "saved-backup-flow",
      flowTitle: "Saved backup flow",
      flowTag: "General",
      subject: "General",
      startedAt: new Date(Date.now() - 120000).toISOString(),
      durationMinutes: 1,
      focusMinutes: 1,
      status: "completed",
      hasReflection: true,
      reflection: {
        comprehension: 4,
        fatigue: 2,
        notes: "Backup notes",
        sessionTitle: "Saved backup flow",
        sessionSubtitle: "General",
      },
    },
  ];
  let uploads = 0;
  await page.route("**/api/workspace/import", (route) => {
    uploads++;
    return route.continue();
  });
  await area.getByLabel("Methodica JSON backup").setInputFiles({
    name: "study-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ workspace: source, preferences: { role: "admin" } })),
  });
  await area.getByRole("button", { name: "Review backup", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(area.getByText(/Destination account:/)).toContainText(email);
  await expect(
    area.getByRole("button", { name: "Copy backup to my account", exact: true })
  ).toBeDisabled();
  expect(uploads).toBe(0);
  await area.getByRole("button", { name: "Cancel backup review", exact: true }).click();
  expect(uploads).toBe(0);
  await area.getByRole("button", { name: "Review backup", exact: true }).click();
  await area.getByLabel(/I want to copy these backup records/).check();
  await area.getByRole("button", { name: "Copy backup to my account", exact: true }).click();
  await expect(area.getByRole("status")).toContainText("1 flows, 1 sessions");
  await area.getByRole("button", { name: "Review backup again", exact: true }).click();
  await expect(
    area.getByText("There is nothing new to copy. Your account has not been changed.", {
      exact: true,
    })
  ).toBeVisible();
  expect(uploads).toBe(1);
  const legacy = {
    id: "old-timer-1",
    flowTitle: "Old biology",
    flowTag: "Biology",
    subject: "Biology",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    durationMinutes: 25,
    hasReflection: false,
  };
  await page.evaluate(
    (value) => localStorage.setItem("methodica-sessions", JSON.stringify([value])),
    legacy
  );
  await area.getByRole("button", { name: "Read older browser sessions", exact: true }).click();
  await expect(area.getByText(/The old timer saved planned durations/)).toBeVisible();
  await area.getByRole("button", { name: "Review backup", exact: true }).click();
  const changedLegacy = { ...legacy, flowTitle: "Updated old biology" };
  await page.evaluate(
    (value) => localStorage.setItem("methodica-sessions", JSON.stringify([value])),
    changedLegacy
  );
  await area.getByLabel(/I want to copy these backup records/).check();
  await area.getByRole("button", { name: "Copy backup to my account", exact: true }).click();
  await expect(area.getByRole("alert")).toContainText("Older browser sessions changed");
  expect(uploads).toBe(1);
  await area.getByRole("button", { name: "Read older browser sessions", exact: true }).click();
  await area.getByRole("button", { name: "Review backup", exact: true }).click();
  await area.getByLabel(/I want to copy these backup records/).check();
  await area.getByRole("button", { name: "Copy backup to my account", exact: true }).click();
  await expect(area.getByRole("status")).toContainText("0 flows, 1 sessions");
  const saved = await (await page.request.get("/api/workspace")).json();
  expect(saved.sessions).toHaveLength(2);
  const old = saved.sessions.find(
    (session: { timingSource?: string }) => session.timingSource === "legacy-estimate"
  );
  expect(old.focusMinutes).toBe(0);
  expect(old.status).toBe("stopped");
  expect(await page.evaluate(() => localStorage.getItem("methodica-sessions"))).toBe(
    JSON.stringify([changedLegacy])
  );
  await page.getByRole("button", { name: "Session History", exact: true }).click();
  await expect(page.getByText("Imported legacy estimate", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("legacy-history.png"), fullPage: true });
  // More than one page, with an old reflection outside the overview cache.
  const origin = new URL(page.url()).origin;
  for (let i = 0; i < 30; i++) {
    const result = await page.request.post("/api/sessions", {
      headers: { Origin: origin },
      data: {
        id: `paged-${i}`,
        flowId: "saved-backup-flow",
        flowTitle: `Paged study ${i}`,
        flowTag: "Physics",
        subject: "Physics",
        startedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        durationMinutes: 1,
        focusMinutes: 0.5,
        status: "stopped",
        blocks: source.flows[0].blocks,
      },
    });
    expect(result.status()).toBe(201);
  }
  await page.reload();
  await expect(page.getByText("Showing 1\u201325 of 32 sessions", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 26\u201332 of 32 sessions", { exact: true })).toBeVisible();
  const oldest = page
    .locator(".session-card")
    .filter({ has: page.getByRole("heading", { name: "Paged study 29", exact: true }) });
  await oldest.getByText("Flow at session start", { exact: true }).click();
  await expect(oldest.getByRole("listitem").first()).toContainText(source.flows[0].blocks[0].title);
  await oldest.getByRole("button", { name: "Add reflection \u2192", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paged study 29", exact: true })).toBeVisible();
  await page.getByLabel("What worked? What would you change?").fill("An older page reflection");
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Reflection saved" })).toBeVisible();
  await page.getByRole("button", { name: "Session History", exact: true }).click();
  await page.getByLabel("Search sessions", { exact: true }).fill("older page reflection");
  await expect(page.locator(".session-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Paged study 29", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  const summaryResponse = page.waitForResponse((response) =>
    response.url().includes("/api/reports/summary?days=30&")
  );
  await page.getByRole("button", { name: "Last 30 days", exact: true }).click();
  const report = await (await summaryResponse).json();
  await expect(page.getByText("Study minutes \u00b7 last 30 days", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  const reportFile = await download;
  expect(reportFile.suggestedFilename()).toBe("methodica-report.csv");
  const lines = (await readFile((await reportFile.path())!, "utf8")).split("\r\n");
  expect(lines.length - 1).toBe(report.count);
  const csvMinutes = lines
    .slice(1)
    .reduce((sum, row) => sum + Number(row.split(",")[5].replaceAll('"', "")), 0);
  expect(csvMinutes).toBeCloseTo(report.focusMinutes, 8);
  expect(
    report.daily.reduce((sum: number, day: { minutes: number }) => sum + day.minutes, 0)
  ).toBeCloseTo(csvMinutes, 8);
  await page.request.put("/api/sessions/paged-0/log", {
    headers: { Origin: origin },
    data: { comprehension: 4, fatigue: 2, notes: "Changed in another tab" },
  });
  await page.getByRole("button", { name: "Export report", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Refresh the report");
  await page.getByRole("button", { name: "Refresh report", exact: true }).click();
  await expect(page.getByText("Study minutes \u00b7 last 30 days", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-report.png"), fullPage: true });

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/#login$/);
  await register(page, "Other backup student", `backup-other-${Date.now()}@example.test`);
  expect((await (await page.request.get("/api/workspace")).json()).sessions).toHaveLength(0);
});

test("a duplicated device tab waits for its owner, then recovers safely after tab closure", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.context().grantPermissions(["notifications"], { origin: new URL(page.url()).origin });
  await page.evaluate(recordNotifications);
  await page.getByRole("button", { name: "Use this device", exact: true }).click();
  await page.getByRole("button", { name: "Study Timer", exact: true }).click();
  await page.getByRole("button", { name: "Start session", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(sessionStorage.getItem("methodica-device-active-timer")!).elapsedMs
      )
    )
    .toBeGreaterThan(1000);
  const opening = page.waitForEvent("popup");
  await page.evaluate(() => window.open(location.href));
  const duplicate = await opening;
  await duplicate.setViewportSize({ width: 375, height: 812 });
  await expect(duplicate.getByText(/This timer is controlled by another tab/)).toBeVisible();
  const before = await duplicate.evaluate(() =>
    JSON.parse(sessionStorage.getItem("methodica-device-active-timer")!)
  );
  await page.close();
  await duplicate.evaluate(recordNotifications);
  expect(await duplicate.evaluate(() => Notification.permission)).toBe("granted");
  expect(
    await duplicate.evaluate(
      () => JSON.parse(localStorage.getItem("methodica-settings")!).notifications
    )
  ).toBe(true);
  await duplicate.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(() =>
      duplicate.evaluate(
        () => JSON.parse(sessionStorage.getItem("methodica-device-active-timer")!).elapsedMs
      )
    )
    .toBeGreaterThan(before.elapsedMs + 1000);
  await duplicate.getByRole("button", { name: "Skip block", exact: true }).click();
  await duplicate.getByRole("button", { name: "Finish & save elapsed time", exact: true }).click();
  await expect(duplicate.getByText("Session saved.", { exact: true })).toBeVisible();
  const saved = await duplicate.evaluate(
    () => JSON.parse(localStorage.getItem("methodica-device-workspace-v1")!).workspace.sessions
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(before.id);
  expect(saved[0].execution.blocks[0].outcome).toBe("skipped");
  expect(saved[0].execution.blocks[1].outcome).toBe("stopped");
  expect(
    await duplicate.evaluate(
      () => (window as unknown as { timerNotices: string[] }).timerNotices.length
    )
  ).toBeGreaterThanOrEqual(1);
  expect(saved[0].execution.events.map((event: { type: string }) => event.type)).toEqual([
    "started",
    "skipped",
    "started",
    "stopped",
  ]);
  await duplicate.getByRole("button", { name: "View history", exact: true }).click();
  await duplicate.getByText("Execution timeline", { exact: true }).click();
  await expect(duplicate.locator(".session-card")).toHaveCount(1);
  await duplicate.screenshot({ path: info.outputPath("device-execution.png"), fullPage: true });
  await duplicate.close();
});
