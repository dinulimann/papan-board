export type Status = "backlog" | "todo" | "doing" | "review" | "done";
export type Priority = "urgent" | "high" | "medium" | "low";

export interface Member { id: string; name: string; role: string; color: string; }
export interface Label { id: string; name: string; color: string; }
export interface CheckItem { id: string; text: string; done: boolean; }
export interface Comment { id: string; author: string; text: string; at: string; }
export interface Activity { at: string; text: string; }

export interface Task {
  id: string; projectId: string; title: string; description: string; status: Status;
  labels: string[]; assignees: string[]; priority: Priority; due: string | null;
  checklist: CheckItem[]; comments: Comment[]; activity: Activity[]; createdAt: string;
}

export interface Project { id: string; key: string; name: string; icon: "receipt" | "globe"; color: string; }

export interface Board {
  projects: Project[];
  tasks: Record<string, Task>;
  /** Task ids per column, in display order, per project. */
  order: Record<string, Record<Status, string[]>>;
  nextNumber: Record<string, number>;
}

export const COLUMNS: { id: Status; title: string; wip?: number; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "var(--c-sand)" },
  { id: "todo", title: "To do", color: "var(--c-sky)" },
  { id: "doing", title: "In progress", wip: 4, color: "var(--c-yellow)" },
  { id: "review", title: "Review", wip: 3, color: "var(--c-lilac)" },
  { id: "done", title: "Done", color: "var(--c-lime)" },
];
export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

export const MEMBERS: Member[] = [
  { id: "you", name: "Dinul", role: "Tech lead", color: "var(--c-orange)" },
  { id: "raka", name: "Raka", role: "Mobile", color: "var(--c-sky)" },
  { id: "sinta", name: "Sinta", role: "Design", color: "var(--c-pink)" },
  { id: "bimo", name: "Bimo", role: "Backend", color: "var(--c-lime)" },
  { id: "laras", name: "Laras", role: "QA", color: "var(--c-lilac)" },
  { id: "yoga", name: "Yoga", role: "Product", color: "var(--c-yellow)" },
];
export const LABELS: Label[] = [
  { id: "bug", name: "Bug", color: "var(--c-pink)" },
  { id: "feature", name: "Feature", color: "var(--c-lime)" },
  { id: "design", name: "Design", color: "var(--c-lilac)" },
  { id: "backend", name: "Backend", color: "var(--c-sky)" },
  { id: "research", name: "Research", color: "var(--c-yellow)" },
  { id: "chore", name: "Chore", color: "var(--c-sand)" },
];
export const memberById = (id: string) => MEMBERS.find((m) => m.id === id);
export const labelById = (id: string) => LABELS.find((l) => l.id === id);
