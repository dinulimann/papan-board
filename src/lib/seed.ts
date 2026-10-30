// Sample boards for a fictional studio. Due dates are relative to the day the data is first created.
import { addDays, isoDay } from "./dates";
import type { Board, Priority, Project, Status, Task } from "./types";

type Row = [title: string, status: Status, labels: string[], assignees: string[], priority: Priority, dueIn: number | null, checklist?: [string, boolean][], description?: string];

const KASIR: Row[] = [
  ["Offline mode: queue sales when the network drops", "doing", ["feature", "backend"], ["bimo", "raka"], "urgent", 2, [["Local SQLite queue", true], ["Retry with backoff", true], ["Conflict rules for stock", false], ["Banner when offline", false]], "Cashiers in malls lose signal often. Sales must keep working and sync when the connection comes back, without double-counting stock."],
  ["QRIS payment screen", "review", ["feature"], ["raka"], "high", 1, [["Show dynamic QR", true], ["Poll payment status", true], ["Timeout after 5 minutes", true]]],
  ["Receipt prints the wrong tax line on split bills", "todo", ["bug"], ["bimo"], "urgent", 0, [], "Reported by the Kemang branch: when a bill is split three ways, the PPN line on the second receipt shows the full amount."],
  ["Design: end-of-day cash report", "doing", ["design"], ["sinta"], "medium", 4, [["Wireframe", true], ["Hi-fi in light and dark", false]]],
  ["Barcode scanning on low-end Android phones", "todo", ["research"], ["raka", "laras"], "medium", 6],
  ["Discount rules: buy 2 get 1", "backlog", ["feature", "backend"], [], "low", null],
  ["Staff PIN login with 3-attempt lockout", "review", ["feature", "backend"], ["bimo"], "high", 3, [["Hash PINs", true], ["Lockout timer", true], ["Owner can reset", false]]],
  ["Crash when the product photo is missing", "doing", ["bug"], ["raka"], "high", -1],
  ["Sync product catalogue from the web dashboard", "todo", ["backend"], ["bimo"], "medium", 8],
  ["Onboarding: first sale in under 2 minutes", "backlog", ["design", "research"], ["sinta", "yoga"], "medium", null],
  ["Regression test plan for v2.0", "todo", ["chore"], ["laras"], "high", 5, [["Payment flows", false], ["Printing", false], ["Offline", false]]],
  ["Customer display mode for a second screen", "backlog", ["feature"], [], "low", null],
  ["Upgrade to the new printer SDK", "done", ["chore"], ["raka"], "medium", -6],
  ["Daily sales summary on WhatsApp", "done", ["feature", "backend"], ["bimo", "yoga"], "medium", -3],
  ["Fix rounding on cash change", "done", ["bug"], ["bimo"], "high", -9],
  ["Icon set for product categories", "done", ["design"], ["sinta"], "low", -4],
  ["Interview 5 cashiers about refunds", "backlog", ["research"], ["yoga"], "medium", null],
  ["Stock alert when an item runs low", "todo", ["feature"], ["you"], "medium", 10],
];
const WEB: Row[] = [
  ["New homepage hero and pricing", "doing", ["design"], ["sinta", "you"], "high", 3, [["Copy approved", true], ["Desktop layout", true], ["Mobile layout", false]]],
  ["Migrate blog posts to the new CMS", "todo", ["chore", "backend"], ["bimo"], "medium", 7],
  ["Contact form sends duplicate emails", "review", ["bug"], ["you"], "high", 1],
  ["Case study pages (3)", "backlog", ["design"], ["sinta"], "medium", null],
  ["Lighthouse score above 90 on mobile", "todo", ["chore"], ["you", "laras"], "medium", 5],
  ["Logo and colour guidelines", "done", ["design"], ["sinta"], "high", -5],
  ["Cookie banner", "done", ["chore"], ["you"], "low", -2],
];

function build(project: Project, rows: Row[], today: string, start: number): [Task[], number] {
  const now = Date.now();
  const tasks = rows.map(([title, status, labels, assignees, priority, dueIn, checklist = [], description = ""], i): Task => {
    const created = new Date(now - (rows.length - i) * 7 * 3_600_000).toISOString();
    return {
      id: `${project.key}-${start + i}`, projectId: project.id, title, description, status, labels, assignees, priority,
      due: dueIn === null ? null : addDays(today, dueIn),
      checklist: checklist.map(([text, done], j) => ({ id: `c${j}`, text, done })),
      comments: i % 3 === 0 && assignees.length ? [{ id: "m0", author: assignees[0], text: i % 2 ? "Started on this, will push a draft today." : "Blocked until the API change is merged.", at: new Date(now - 5 * 3_600_000).toISOString() }] : [],
      activity: [{ at: created, text: "Created" }],
      createdAt: created,
    };
  });
  return [tasks, start + rows.length];
}

export function seed(): Board {
  const today = isoDay(new Date());
  const projects: Project[] = [
    { id: "kasir", key: "KSR", name: "Kasir app v2", icon: "receipt", color: "var(--c-orange)" },
    { id: "web", key: "WEB", name: "Website rebrand", icon: "globe", color: "var(--c-sky)" },
  ];
  const board: Board = { projects, tasks: {}, order: {}, nextNumber: {} };
  for (const [p, rows, start] of [[projects[0], KASIR, 101], [projects[1], WEB, 31]] as const) {
    const [tasks, next] = build(p, rows, today, start);
    board.order[p.id] = { backlog: [], todo: [], doing: [], review: [], done: [] };
    for (const t of tasks) { board.tasks[t.id] = t; board.order[p.id][t.status].push(t.id); }
    board.nextNumber[p.id] = next;
  }
  return board;
}
