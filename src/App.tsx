import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { Columns3, Keyboard, List, Moon, Plus, Redo2, RotateCcw, Search, SlidersHorizontal, Sun, Undo2, X } from "lucide-react";
import { StoreProvider, useStore } from "./lib/store";
import { href, setParams, useLoc } from "./lib/router";
import { daysUntil } from "./lib/dates";
import { LABELS, MEMBERS, PRIORITIES, type Status, type Task } from "./lib/types";
import Board from "./components/Board";
import ListView from "./components/ListView";
import TaskModal from "./components/TaskModal";
import { Avatar, Button, CloseButton, Kbd, LabelChip, MenuCheck, Modal, Popover, PriorityBadge, ProjectIcon, priorityText, useTheme } from "./components/ui";

const csv = (v: string | null) => (v ?? "").split(",").filter(Boolean);
const editable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

function Toaster() {
  const { toasts, undo, dismiss } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border-2 border-ink bg-ink py-2 pr-2 pl-4 text-sm font-semibold text-bg shadow-[3px_3px_0_var(--c-yellow)]">
            {t.text}
            {t.undo && <button onClick={undo} className="rounded-lg bg-yellow px-2.5 py-1 text-[13px] font-bold text-on">Undo</button>}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-md p-1 opacity-70 hover:opacity-100"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["N"], "New task in To do"], [["/"], "Search"], [["B"], "Board view"], [["L"], "List view"],
  [["⌘", "Z"], "Undo"], [["⌘", "⇧", "Z"], "Redo"], [["?"], "This list"], [["Esc"], "Close"],
  [["Space"], "Pick up a focused card, arrows to move, Space to drop"], [["Enter"], "Open the focused card"],
];

function Workspace() {
  const { board, dispatch, undo, redo, canUndo, canRedo } = useStore();
  const { project: pid, view, params } = useLoc();
  const project = board.projects.find((p) => p.id === pid) ?? board.projects[0];
  const [dark, toggleTheme] = useTheme();
  const [adding, setAdding] = useState<Status | null>(null);
  const [help, setHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  const q = params.get("q") ?? "";
  const who = csv(params.get("who")), labels = csv(params.get("label")), prios = csv(params.get("prio"));
  const overdue = params.get("due") === "overdue";
  const key = [q, who, labels, prios, overdue].join("|");
  const visible = useCallback((t: Task) => {
    if (q && !`${t.id} ${t.title}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (who.length && !t.assignees.some((a) => who.includes(a))) return false;
    if (labels.length && !t.labels.some((l) => labels.includes(l))) return false;
    if (prios.length && !prios.includes(t.priority)) return false;
    if (overdue && !(t.due && t.status !== "done" && daysUntil(t.due) < 0)) return false;
    return true;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtering = !!(q || who.length || labels.length || prios.length || overdue);

  const tasks = Object.values(board.tasks).filter((t) => t.projectId === project.id);
  const doneN = board.order[project.id].done.length;
  const lateN = tasks.filter((t) => t.due && t.status !== "done" && daysUntil(t.due) < 0).length;
  const toggle = (k: string, list: string[], v: string) => setParams({ [k]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });
  const openTask = useCallback((id: string) => setParams({ task: id }), []);
  const closeTask = useCallback(() => setParams({ task: null }), []);
  const go = (v: "board" | "list") => { window.location.hash = href(project.id, v, params).slice(1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (editable(e.target)) return;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod || e.altKey || document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") { e.preventDefault(); search.current?.focus(); }
      else if (e.key === "n") { e.preventDefault(); if (view !== "board") go("board"); setAdding("todo"); }
      else if (e.key === "b") go("board");
      else if (e.key === "l") go("list");
      else if (e.key === "?") setHelp(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const projectLinks = board.projects.map((p) => {
    const n = Object.values(board.tasks).filter((t) => t.projectId === p.id).length;
    const pct = n ? Math.round((board.order[p.id].done.length / n) * 100) : 0;
    return { p, n, pct };
  });

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-ink bg-panel lg:flex">
        <div className="flex items-center gap-2.5 border-b-2 border-ink px-5 py-4">
          <img src="/favicon.svg" alt="" className="size-8" />
          <div><p className="text-lg leading-none font-bold">Papan</p><p className="mt-1 text-xs text-muted">Studio Lontar</p></div>
        </div>
        <nav aria-label="Projects" className="space-y-1.5 p-3">
          <p className="px-2 pb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Projects</p>
          {projectLinks.map(({ p, n, pct }) => (
            <a key={p.id} href={href(p.id, view)} aria-current={p.id === project.id ? "page" : undefined}
              className={`block rounded-xl border-2 px-3 py-2.5 ${p.id === project.id ? "border-ink bg-yellow text-on shadow-[2px_2px_0_var(--ink)]" : "border-transparent hover:border-ink hover:bg-soft"}`}>
              <span className="flex items-center gap-2 text-sm font-bold"><ProjectIcon project={p} size={22} />{p.name}</span>
              <span className="mt-2 flex items-center gap-2 text-[11px] font-semibold opacity-75">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full border border-current"><span className="block h-full bg-current" style={{ width: `${pct}%` }} /></span>{pct}% of {n}
              </span>
            </a>
          ))}
        </nav>
        <div className="space-y-0.5 p-3">
          <p className="px-2 pb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">Team · open tasks</p>
          {MEMBERS.map((m) => {
            const open = tasks.filter((t) => t.status !== "done" && t.assignees.includes(m.id)).length;
            const on = who.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggle("who", who, m.id)} aria-pressed={on} className={`flex w-full items-center gap-2.5 rounded-lg border-2 px-2 py-1.5 text-left ${on ? "border-ink bg-soft" : "border-transparent hover:bg-soft"}`}>
                <Avatar id={m.id} size={26} />
                <span className="flex-1 leading-tight"><span className="block text-sm font-semibold">{m.name}</span><span className="text-[11px] text-muted">{m.role}</span></span>
                <span className="tnum flex items-center gap-1 text-xs font-bold">
                  {Array.from({ length: Math.min(open, 6) }, (_, i) => <span key={i} className={`h-3 w-1 rounded-sm ${open > 4 ? "bg-danger" : "bg-ink/70"}`} />)}
                  <span className="ml-1 w-3 text-right">{open}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-auto space-y-1 border-t-2 border-ink p-3">
          <button onClick={() => setHelp(true)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-soft"><Keyboard size={16} /> Shortcuts <span className="ml-auto"><Kbd>?</Kbd></span></button>
          <button onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-soft"><RotateCcw size={16} /> Reset demo data</button>
          <p className="px-2 pt-2 text-[11px] leading-snug text-muted">Studio Lontar and its projects are fictional. Data stays in your browser. Built by Dinul Iman.</p>
        </div>
      </aside>

      <main className="dots flex min-w-0 flex-1 flex-col">
        <header className="space-y-4 px-4 pt-5 pb-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <label className="mb-3 flex items-center gap-2 lg:hidden">
                <img src="/favicon.svg" alt="" className="size-7" /><span className="sr-only">Project</span>
                <select value={project.id} onChange={(e) => { window.location.hash = href(e.target.value, view).slice(1); }} className="h-8 rounded-lg border-2 border-ink bg-panel px-2 text-sm font-bold">
                  {board.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl"><span className="hidden sm:block"><ProjectIcon project={project} size={36} /></span>{project.name}</h1>
              <p className="mt-1 text-sm text-muted"><span className="tnum">{tasks.length}</span> tasks · <span className="tnum">{doneN}</span> done{lateN > 0 && <> · <button onClick={() => setParams({ due: overdue ? null : "overdue" })} className="font-bold text-danger underline-offset-2 hover:underline">{lateN} overdue</button></>}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="size-9 px-0" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)"><Undo2 size={17} /></Button>
              <Button variant="ghost" size="sm" className="size-9 px-0" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⌘⇧Z)"><Redo2 size={17} /></Button>
              <Button variant="default" size="sm" className="size-9 px-0" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</Button>
              <Button variant="primary" className="ml-auto sm:ml-0" onClick={() => { if (view !== "board") go("board"); setAdding("todo"); }}><Plus size={17} strokeWidth={2.5} /> New task <span className="hidden sm:inline"><Kbd>N</Kbd></span></Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="brut-sm flex rounded-lg bg-panel p-0.5" role="tablist" aria-label="View">
              {(["board", "list"] as const).map((v) => (
                <a key={v} role="tab" aria-selected={view === v} href={href(project.id, v, params)} className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-bold ${view === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
                  {v === "board" ? <Columns3 size={15} /> : <List size={15} />}{v === "board" ? "Board" : "List"}
                </a>
              ))}
            </div>
            <label className="relative w-full sm:w-56">
              <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
              <input ref={search} value={q} onChange={(e) => setParams({ q: e.target.value })} onKeyDown={(e) => e.key === "Escape" && (e.target as HTMLInputElement).blur()} placeholder="Search tasks" aria-label="Search tasks"
                className="brut-sm h-9 w-full rounded-lg bg-panel pr-8 pl-8 text-sm font-medium outline-none" />
              <span className="absolute top-1/2 right-2 -translate-y-1/2"><Kbd>/</Kbd></span>
            </label>
            <div className="flex items-center -space-x-1.5 lg:hidden" role="group" aria-label="Filter by person">
              {MEMBERS.map((m) => (
                <button key={m.id} aria-pressed={who.includes(m.id)} aria-label={m.name} onClick={() => toggle("who", who, m.id)} className={`rounded-full ${who.includes(m.id) ? "relative z-10 ring-2 ring-ink ring-offset-2 ring-offset-[var(--bg)]" : ""}`}><Avatar id={m.id} size={30} /></button>
              ))}
            </div>
            <Popover label="Labels" trigger={() => <Button size="sm" className="h-9">Labels{labels.length > 0 && <span className="rounded bg-ink px-1 text-bg">{labels.length}</span>}</Button>}>
              {() => LABELS.map((l) => <MenuCheck key={l.id} on={labels.includes(l.id)} onClick={() => toggle("label", labels, l.id)}><LabelChip id={l.id} /></MenuCheck>)}
            </Popover>
            <Popover label="Priority" trigger={() => <Button size="sm" className="h-9">Priority{prios.length > 0 && <span className="rounded bg-ink px-1 text-bg">{prios.length}</span>}</Button>}>
              {() => PRIORITIES.map((p) => <MenuCheck key={p} on={prios.includes(p)} onClick={() => toggle("prio", prios, p)}><PriorityBadge p={p} /> {priorityText(p)}</MenuCheck>)}
            </Popover>
            <Button size="sm" className={`h-9 ${overdue ? "bg-danger! text-white" : ""}`} aria-pressed={overdue} onClick={() => setParams({ due: overdue ? null : "overdue" })}>Overdue</Button>
            {filtering && <Button variant="ghost" size="sm" className="h-9" onClick={() => setParams({ q: null, who: null, label: null, prio: null, due: null })}><SlidersHorizontal size={14} /> Clear filters</Button>}
          </div>
        </header>

        {view === "board"
          ? <Board key={project.id} projectId={project.id} visible={visible} onOpen={openTask} adding={adding} setAdding={setAdding} />
          : <ListView projectId={project.id} visible={visible} onOpen={openTask} />}
        <p className="px-6 pb-6 text-center text-[11px] text-muted lg:hidden">Studio Lontar and its projects are fictional. Built by Dinul Iman.</p>
      </main>

      <TaskModal id={params.get("task")} onClose={closeTask} />

      <Modal open={help} onClose={() => setHelp(false)} label="Keyboard shortcuts">
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3"><h2 className="font-bold">Keyboard shortcuts</h2><CloseButton onClick={() => setHelp(false)} /></div>
        <ul className="divide-y-2 divide-ink/10 px-5 py-2">
          {SHORTCUTS.map(([keys, text]) => <li key={text} className="flex items-center justify-between gap-4 py-2 text-sm"><span>{text}</span><span className="flex shrink-0 gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span></li>)}
        </ul>
        <p className="border-t-2 border-ink px-5 py-3 text-xs text-muted">Quick add understands <b>#label</b>, <b>@person</b>, <b>!priority</b> and <b>^due</b> (today, tomorrow, fri, 3d or a date).</p>
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} label="Reset demo data">
        <div className="p-5">
          <h2 className="text-lg font-bold">Reset demo data?</h2>
          <p className="mt-1 text-sm text-muted">Every project goes back to the original sample tasks. You can still undo this.</p>
          <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { dispatch({ type: "reset" }, "Demo data restored"); setConfirmReset(false); }}>Reset</Button></div>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Workspace />
        <Toaster />
      </StoreProvider>
    </MotionConfig>
  );
}
