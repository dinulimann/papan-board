import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { seed } from "./seed";
import { COLUMNS, type Board, type Status, type Task } from "./types";

export type Action =
  | { type: "move"; id: string; to: Status; index: number }
  | { type: "add"; task: Omit<Task, "id" | "activity" | "createdAt" | "comments">; top?: boolean }
  | { type: "update"; id: string; patch: Partial<Task>; log?: string }
  | { type: "delete"; id: string }
  | { type: "reset" };

const now = () => new Date().toISOString();
const colTitle = (s: Status) => COLUMNS.find((c) => c.id === s)!.title;

export function apply(b: Board, a: Action): Board {
  switch (a.type) {
    case "move": {
      const t = b.tasks[a.id];
      const cols = { ...b.order[t.projectId] };
      cols[t.status] = cols[t.status].filter((x) => x !== a.id);
      const dest = [...cols[a.to]];
      dest.splice(Math.max(0, Math.min(a.index, dest.length)), 0, a.id);
      cols[a.to] = dest;
      const moved = t.status !== a.to;
      return {
        ...b, order: { ...b.order, [t.projectId]: cols },
        tasks: moved ? { ...b.tasks, [a.id]: { ...t, status: a.to, activity: [...t.activity, { at: now(), text: `Moved from ${colTitle(t.status)} to ${colTitle(a.to)}` }] } } : b.tasks,
      };
    }
    case "add": {
      const p = b.projects.find((x) => x.id === a.task.projectId)!;
      const n = b.nextNumber[p.id];
      const task: Task = { ...a.task, id: `${p.key}-${n}`, comments: [], createdAt: now(), activity: [{ at: now(), text: "Created" }] };
      const cols = { ...b.order[p.id] };
      cols[task.status] = a.top ? [task.id, ...cols[task.status]] : [...cols[task.status], task.id];
      return { ...b, tasks: { ...b.tasks, [task.id]: task }, order: { ...b.order, [p.id]: cols }, nextNumber: { ...b.nextNumber, [p.id]: n + 1 } };
    }
    case "update": {
      const t = b.tasks[a.id];
      if (a.patch.status && a.patch.status !== t.status) {
        const moved = apply(b, { type: "move", id: a.id, to: a.patch.status, index: b.order[t.projectId][a.patch.status].length });
        return apply(moved, { ...a, patch: { ...a.patch, status: undefined } });
      }
      const patch = Object.fromEntries(Object.entries(a.patch).filter(([, v]) => v !== undefined));
      return { ...b, tasks: { ...b.tasks, [a.id]: { ...t, ...patch, activity: a.log ? [...t.activity, { at: now(), text: a.log }] : t.activity } } };
    }
    case "delete": {
      const t = b.tasks[a.id];
      const tasks = { ...b.tasks }; delete tasks[a.id];
      const cols = { ...b.order[t.projectId], [t.status]: b.order[t.projectId][t.status].filter((x) => x !== a.id) };
      return { ...b, tasks, order: { ...b.order, [t.projectId]: cols } };
    }
    case "reset":
      return seed();
  }
}

interface History { past: Board[]; present: Board; future: Board[]; }
type HAction = Action | { type: "undo" } | { type: "redo" };
const LIMIT = 50;

function historyReducer(h: History, a: HAction): History {
  if (a.type === "undo") return h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h;
  if (a.type === "redo") return h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h;
  const next = apply(h.present, a);
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
}

const KEY = "papan:board:v1";
function load(): History {
  let present: Board | null = null;
  try { const raw = localStorage.getItem(KEY); if (raw) present = JSON.parse(raw) as Board; } catch { /* use fresh data */ }
  return { past: [], present: present ?? seed(), future: [] };
}

export interface Toast { id: number; text: string; undo?: boolean; }
interface Store {
  board: Board;
  dispatch: (a: Action, toast?: string) => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  toasts: Toast[]; notify: (text: string) => void; dismiss: (id: number) => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [h, send] = useReducer(historyReducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(h.present)); } catch { /* storage blocked: keep in memory */ } }, [h.present]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((text: string, undo: boolean) => {
    const id = ++seq.current;
    // Only the newest toast offers undo, because undo always reverts the latest change.
    setToasts((t) => [...t.slice(-2).map((x) => ({ ...x, undo: false })), { id, text, undo }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);
  const dispatch = useCallback((a: Action, toast?: string) => { send(a); if (toast) push(toast, true); }, [push]);
  const undo = useCallback(() => { send({ type: "undo" }); setToasts([]); }, []);
  const redo = useCallback(() => send({ type: "redo" }), []);
  const notify = useCallback((text: string) => push(text, false), [push]);

  const value = useMemo(() => ({ board: h.present, dispatch, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0, toasts, notify, dismiss }),
    [h, dispatch, undo, redo, toasts, notify, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
