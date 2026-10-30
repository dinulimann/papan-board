import { expect, test, type Page } from "@playwright/test";

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
});
test.afterEach(() => expect(errors).toEqual([]));

const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const card = (page: Page, id: string) => page.locator(`[data-task="${id}"]`);

async function drag(page: Page, from: string, toColumn: string) {
  const a = (await card(page, from).boundingBox())!;
  const b = (await column(page, toColumn).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + 30, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + 90, { steps: 12 });
  await page.mouse.up();
}

test("board shows five columns and the WIP limits", async ({ page }) => {
  await page.goto("/");
  for (const c of ["Backlog", "To do", "In progress", "Review", "Done"]) await expect(column(page, c)).toBeVisible();
  await expect(column(page, "In progress")).toContainText("WIP 3/4");
  await expect(column(page, "Review")).toContainText("WIP 2/3");
});

test("drag a card to another column, then undo", async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  await page.goto("/");
  await drag(page, "KSR-103", "Done");
  await expect(column(page, "Done").locator('[data-task="KSR-103"]')).toBeVisible();
  await expect(page.getByText("KSR-103 moved to Done")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(column(page, "To do").locator('[data-task="KSR-103"]')).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(column(page, "Done").locator('[data-task="KSR-103"]')).toBeVisible();
  await page.reload(); // the move is saved; undo history is not
  await expect(column(page, "Done").locator('[data-task="KSR-103"]')).toBeVisible();
});

test("move a card with the keyboard only", async ({ page }) => {
  await page.goto("/");
  const live = page.locator('[id^="DndLiveRegion"]');
  await card(page, "KSR-103").focus();
  await page.keyboard.press("Space");
  await expect(live).toContainText("is over To do"); // pick-up, then the first "over" message
  await page.waitForTimeout(150); // dnd-kit attaches its arrow-key listener a tick after pick-up
  await page.keyboard.press("ArrowRight");
  await expect(live).toContainText("is over In progress");
  await page.keyboard.press("Space");
  await expect(live).toContainText("Dropped Receipt prints the wrong tax line on split bills in In progress");
  await expect(column(page, "In progress").locator('[data-task="KSR-103"]')).toBeVisible();
  await expect(column(page, "In progress")).toContainText("WIP 4/4");
});

test("going over a WIP limit is flagged", async ({ page }) => {
  await page.goto("/#/kasir/list");
  for (const id of ["KSR-103", "KSR-105"]) await page.getByLabel(`Status of ${id}`).selectOption("doing");
  await page.goto("/#/kasir/board");
  await expect(column(page, "In progress")).toContainText("Over limit 5/4");
});

test("quick add turns tokens into fields", async ({ page }) => {
  await page.goto("/");
  await expect(column(page, "To do")).toBeVisible();
  await page.keyboard.press("n");
  await page.getByLabel("New task").fill("Refund flow for QRIS #feature @bimo !high");
  await expect(page.getByTestId("quickadd-preview")).toContainText("@Bimo");
  await page.keyboard.press("Enter");
  const added = card(page, "KSR-119");
  await expect(added).toContainText("Refund flow for QRIS");
  await expect(added).toContainText("Feature");
  await expect(added.getByTitle("High priority")).toBeVisible();
  await expect(added.getByTitle("Bimo")).toBeVisible();
});

test("edit a task in the detail view", async ({ page }) => {
  await page.goto("/");
  await card(page, "KSR-109").click();
  const dialog = page.getByRole("dialog");
  await expect(page).toHaveURL(/task=KSR-109/);
  await dialog.getByLabel("New checklist item").fill("Handle deleted products");
  await dialog.getByLabel("New checklist item").press("Enter");
  await dialog.getByLabel("Handle deleted products", { exact: true }).check();
  await dialog.getByLabel("Status").selectOption("review");
  await dialog.getByLabel("New comment").fill("Ready for a look");
  await dialog.getByRole("button", { name: "Comment" }).click();
  await expect(dialog).toContainText("Moved from To do to Review");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const moved = column(page, "Review").locator('[data-task="KSR-109"]');
  await expect(moved).toContainText("1/1");
  await page.reload();
  await expect(moved).toContainText("1/1");
});

test("filters by person, label and overdue, kept in the URL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("complementary").getByRole("button", { name: /Sinta/ }).click();
  await expect(page).toHaveURL(/who=sinta/);
  await expect(page.locator("[data-task]")).toHaveCount(3);
  await page.reload();
  await expect(page.locator("[data-task]")).toHaveCount(3);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Overdue", exact: true }).click();
  await expect(page.locator("[data-task]")).toHaveCount(1);
  await expect(card(page, "KSR-108")).toBeVisible();
  await page.goto("/#/kasir/board?label=bug");
  await expect(page.locator("[data-task]")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Labels 1" })).toBeVisible();
  await page.keyboard.press("/");
  await page.keyboard.type("receipt");
  await expect(page.locator("[data-task]")).toHaveCount(1);
});

test("delete from the detail view and undo from the toast", async ({ page }) => {
  await page.goto("/#/kasir/board?task=KSR-117");
  await page.getByRole("dialog").getByRole("button", { name: "Delete task" }).click();
  await expect(card(page, "KSR-117")).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(card(page, "KSR-117")).toBeVisible();
});

test("dark mode and the shortcut list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(column(page, "To do")).toBeVisible();
  await page.keyboard.press("?");
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(help).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toHaveCount(0);
  await page.keyboard.press("l");
  await expect(page).toHaveURL(/#\/kasir\/list/);
});
