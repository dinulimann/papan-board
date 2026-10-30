import { expect, test } from "@playwright/test";
import { parseQuickAdd } from "../src/lib/quickadd";

// 2026-11-04 is a Wednesday.
const TODAY = "2026-11-04";

test("quick add reads labels, people, priority and due date", () => {
  expect(parseQuickAdd("Fix receipt tax #bug @raka @me !urgent ^tomorrow", TODAY)).toEqual({
    title: "Fix receipt tax", labels: ["bug"], assignees: ["raka", "you"], priority: "urgent", due: "2026-11-05",
  });
});

test("quick add due dates: weekday, relative and ISO", () => {
  expect(parseQuickAdd("a ^fri", TODAY).due).toBe("2026-11-06");
  expect(parseQuickAdd("a ^wed", TODAY).due).toBe("2026-11-11"); // same weekday means next week
  expect(parseQuickAdd("a ^3d", TODAY).due).toBe("2026-11-07");
  expect(parseQuickAdd("a ^2026-12-01", TODAY).due).toBe("2026-12-01");
});

test("unknown tokens stay in the title", () => {
  const p = parseQuickAdd("Email #team about @lunch !!! ^someday", TODAY);
  expect(p.title).toBe("Email #team about @lunch !!! ^someday");
  expect(p).toMatchObject({ labels: [], assignees: [], priority: null, due: null });
});
