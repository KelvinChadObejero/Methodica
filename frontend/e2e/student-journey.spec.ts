import { test, expect, type Page } from "@playwright/test";

const password = "class demo study passphrase 2026";
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
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByLabel("Flow name")).toHaveValue("Biology class preparation");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
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
  await page.getByRole("button", { name: "Start session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  // Real elapsed time: the server also validates duration, so no fake clock.
  await expect(page.getByText("Session saved.", { exact: true })).toBeVisible({ timeout: 130000 });
  await page.getByRole("button", { name: "Add reflection", exact: true }).click();
  const notes = page.getByLabel("What worked? What would you change?");
  await notes.fill("Retrieving the solution helped. Review cell division next.");
  await page.route("**/api/sessions/*/log", (route) =>
    route.fulfill({ status: 503, json: { message: "Temporary reflection failure" } })
  );
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(notes).toHaveValue("Retrieving the solution helped. Review cell division next.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(notes).toHaveValue("Retrieving the solution helped. Review cell division next.");
  await page.unroute("**/api/sessions/*/log");
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reflection saved");
  const saved = await (await page.request.get("/api/workspace")).json();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].status).toBe("completed");
  expect(saved.sessions[0].durationMinutes).toBe(2);
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
    headers: { Origin: "http://127.0.0.1:5174" },
    data: { comprehension: 1, fatigue: 1, notes: "unauthorized" },
  });
  expect(denied.status()).toBe(404);
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
