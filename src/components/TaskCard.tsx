import { forwardRef, type HTMLAttributes } from "react";
import { CalendarDays, CheckSquare, MessageSquare } from "lucide-react";
import { daysUntil, dueLabel } from "../lib/dates";
import type { Task } from "../lib/types";
import { AvatarStack, LabelChip, PriorityBadge } from "./ui";

export function DueChip({ task }: { task: Task }) {
  if (!task.due) return null;
  const n = daysUntil(task.due);
  const done = task.status === "done";
  const cls = done ? "bg-soft text-muted" : n < 0 ? "bg-danger text-white" : n <= 1 ? "bg-orange text-on" : "bg-soft text-ink";
  return <span className={`inline-flex h-[22px] items-center gap-1 rounded-md border-2 border-ink px-1.5 text-[11px] font-bold ${cls}`}><CalendarDays size={12} strokeWidth={2.5} />{done ? new Date(`${task.due}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : dueLabel(task.due)}</span>;
}

type Props = HTMLAttributes<HTMLDivElement> & { task: Task; dragging?: boolean; overlay?: boolean };

export const TaskCard = forwardRef<HTMLDivElement, Props>(function TaskCard({ task, dragging, overlay, className = "", ...rest }, ref) {
  const done = task.checklist.filter((c) => c.done).length;
  return (
    <div ref={ref} {...rest} data-task={task.id}
      className={`group rounded-xl border-2 border-ink bg-panel p-3 text-left select-none ${dragging ? "opacity-30" : ""} ${overlay ? "rotate-[2.5deg] cursor-grabbing shadow-[6px_6px_0_var(--ink)]" : "cursor-grab shadow-[2px_2px_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--ink)]"} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">{task.id}</span>
        <PriorityBadge p={task.priority} />
      </div>
      <p className={`mt-1.5 text-[14.5px] leading-snug font-semibold ${task.status === "done" ? "text-muted line-through decoration-2" : ""}`}>{task.title}</p>
      {task.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{task.labels.map((l) => <LabelChip key={l} id={l} />)}</div>}
      {task.checklist.length > 0 && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full border border-ink bg-soft" aria-hidden>
          <div className="h-full bg-lime" style={{ width: `${(done / task.checklist.length) * 100}%` }} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <DueChip task={task} />
        {task.checklist.length > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title="Checklist"><CheckSquare size={13} />{done}/{task.checklist.length}</span>}
        {task.comments.length > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title="Comments"><MessageSquare size={13} />{task.comments.length}</span>}
        <span className="ml-auto"><AvatarStack ids={task.assignees} size={24} /></span>
      </div>
    </div>
  );
});
