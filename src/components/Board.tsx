import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useStore } from "../lib/store";
import { COLUMNS, type Status, type Task } from "../lib/types";
import { TaskCard } from "./TaskCard";
import QuickAdd from "./QuickAdd";

type Cols = Record<Status, string[]>;
const STATUSES = COLUMNS.map((c) => c.id);

/**
 * Up and down move within a column (dnd-kit's sortable getter). Left and right jump to the
 * top of the neighbouring column, which the default getter does not do across containers.
 */
const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return sortableKeyboardCoordinates(event, args);
  event.preventDefault();
  const rect = args.context.collisionRect;
  if (!rect) return undefined;
  const cols = Array.from(document.querySelectorAll<HTMLElement>("[data-column]"));
  const mid = rect.left + rect.width / 2;
  const cur = cols.findIndex((c) => { const r = c.getBoundingClientRect(); return mid >= r.left && mid <= r.right; });
  const target = cols[cur + (event.code === "ArrowRight" ? 1 : -1)];
  if (cur < 0 || !target) return undefined;
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
  const drop = target.querySelector<HTMLElement>("[data-drop]")!.getBoundingClientRect();
  return { x: drop.left + 4, y: drop.top + 4 };
};

function SortableCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li>
      <TaskCard ref={setNodeRef} task={task} dragging={isDragging} {...attributes} {...listeners}
        aria-label={`${task.id}: ${task.title}`}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        onClick={() => onOpen(task.id)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOpen(task.id); } else listeners?.onKeyDown?.(e); }} />
    </li>
  );
}

function Column({ status, ids, total, tasks, projectId, onOpen, adding, setAdding }: { status: Status; ids: string[]; total: number; tasks: Record<string, Task>; projectId: string; onOpen: (id: string) => void; adding: boolean; setAdding: (v: boolean) => void }) {
  const col = COLUMNS.find((c) => c.id === status)!;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const over = col.wip !== undefined && total > col.wip;
  return (
    <section aria-label={col.title} data-column={status} className="flex w-[84vw] max-w-80 shrink-0 snap-start flex-col sm:w-72">
      <header className="brut-sm mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-on" style={{ background: col.color }}>
        <h2 className="text-[15px] font-bold">{col.title}</h2>
        <span className="tnum rounded-md bg-[#141414] px-1.5 text-xs leading-5 font-bold text-white">{total}</span>
        {col.wip !== undefined && (
          <span className={`ml-auto rounded-md border-2 border-[#141414] px-1.5 text-[11px] leading-[18px] font-bold ${over ? "bg-[#e5484d] text-white" : "bg-white/60"}`} title={`Work-in-progress limit: ${col.wip}`}>
            {over ? `Over limit ${total}/${col.wip}` : `WIP ${total}/${col.wip}`}
          </span>
        )}
      </header>
      <div ref={setNodeRef} data-drop className={`flex min-h-24 flex-1 flex-col gap-2.5 rounded-xl p-1 transition-colors ${isOver ? "bg-ink/5" : ""} ${over ? "over-wip" : ""}`}>
        <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2.5">
            {ids.map((id) => tasks[id] && <SortableCard key={id} task={tasks[id]} onOpen={onOpen} />)}
          </ul>
        </SortableContext>
        {ids.length === 0 && !adding && <p className="rounded-xl border-2 border-dashed border-ink/25 px-3 py-6 text-center text-[13px] text-muted">{total ? "No tasks match the filters" : "Drop a task here"}</p>}
        <QuickAdd projectId={projectId} status={status} open={adding} setOpen={setAdding} />
      </div>
    </section>
  );
}

function Confetti({ burst }: { burst: { x: number; y: number; key: number } | null }) {
  const reduce = useReducedMotion();
  const colors = ["var(--c-yellow)", "var(--c-pink)", "var(--c-lime)", "var(--c-sky)", "var(--c-lilac)", "var(--c-orange)"];
  if (reduce || !burst) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden key={burst.key}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2, d = 60 + (i % 4) * 22;
        return (
          <motion.span key={i} className="absolute size-2.5 rounded-[2px] border border-[#141414]" style={{ left: burst.x, top: burst.y, background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 40, opacity: 0, rotate: 200 + i * 20 }} transition={{ duration: 0.8, ease: "easeOut" }} />
        );
      })}
    </div>
  );
}

export default function Board({ projectId, visible, onOpen, adding, setAdding }: { projectId: string; visible: (t: Task) => boolean; onOpen: (id: string) => void; adding: Status | null; setAdding: (s: Status | null) => void }) {
  const { board, dispatch } = useStore();
  const full = board.order[projectId];
  const filtered = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, full[s].filter((id) => visible(board.tasks[id]))])) as Cols, [full, board.tasks, visible]);
  const [items, setItems] = useState<Cols | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const cols = items ?? filtered;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } }),
  );
  const findCol = (id: string, c: Cols = cols): Status | undefined => (STATUSES.includes(id as Status) ? (id as Status) : STATUSES.find((s) => c[s].includes(id)));
  const colTitle = (s?: Status) => COLUMNS.find((c) => c.id === s)?.title ?? "";

  const onDragStart = ({ active }: DragStartEvent) => { setActiveId(String(active.id)); setItems(filtered); };
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !items) return;
    const from = findCol(String(active.id)), to = findCol(String(over.id));
    if (!from || !to || from === to) return;
    setItems((prev) => {
      if (!prev) return prev;
      const dest = [...prev[to]];
      const overIdx = dest.indexOf(String(over.id));
      const below = active.rect.current.translated && over.rect ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2 : false;
      dest.splice(overIdx >= 0 ? overIdx + (below ? 1 : 0) : dest.length, 0, String(active.id));
      return { ...prev, [from]: prev[from].filter((x) => x !== active.id), [to]: dest };
    });
  };
  const finish = () => { setItems(null); setActiveId(null); };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    if (!over || !items) return finish();
    const to = findCol(String(over.id), items);
    if (!to) return finish();
    let list = items[to];
    const a = list.indexOf(id), b = list.indexOf(String(over.id));
    if (b >= 0 && a !== b) list = arrayMove(list, a, b);
    // Map the position among visible cards to a position in the full (unfiltered) column.
    const vis = list.indexOf(id);
    const rest = full[to].filter((x) => x !== id);
    const index = vis > 0 ? rest.indexOf(list[vis - 1]) + 1 : list.length > 1 ? rest.indexOf(list[1]) : 0;
    const task = board.tasks[id];
    finish();
    if (task.status === to && full[to].indexOf(id) === index) return;
    dispatch({ type: "move", id, to, index }, task.status === to ? undefined : `${id} moved to ${colTitle(to)}`);
    if (to === "done" && task.status !== "done") {
      const r = active.rect.current.translated;
      if (r) setBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2, key: Date.now() });
    }
  };

  const title = (id: string | number) => board.tasks[String(id)]?.title ?? "task";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)} in ${colTitle(findCol(String(active.id)))}.`,
    onDragOver: ({ active, over }) => over ? `${title(active.id)} is over ${colTitle(findCol(String(over.id)))}.` : `${title(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) => over ? `Dropped ${title(active.id)} in ${colTitle(findCol(String(over.id)))}.` : `Dropped ${title(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${title(active.id)} went back.`,
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={finish}
      accessibility={{ announcements, screenReaderInstructions: { draggable: "Press Enter to open this task. To move it, press Space, use the arrow keys, then press Space again to drop or Escape to cancel." } }}>
      <div className="flex flex-1 snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pt-1 pb-8 sm:snap-none sm:px-6" data-testid="board">
        {STATUSES.map((s) => (
          <Column key={s} status={s} ids={cols[s]} total={full[s].length + (items && findCol(activeId ?? "", items) === s && board.tasks[activeId!]?.status !== s ? 1 : 0) - (items && board.tasks[activeId ?? ""]?.status === s && findCol(activeId!, items) !== s ? 1 : 0)}
            tasks={board.tasks} projectId={projectId} onOpen={onOpen} adding={adding === s} setAdding={(v) => setAdding(v ? s : null)} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
        {activeId && board.tasks[activeId] ? <TaskCard task={board.tasks[activeId]} overlay /> : null}
      </DragOverlay>
      <AnimatePresence><Confetti burst={burst} /></AnimatePresence>
    </DndContext>
  );
}
