import { useState } from "react";
import { Plus } from "lucide-react";
import { parseQuickAdd } from "../lib/quickadd";
import { dueLabel } from "../lib/dates";
import { memberById, type Status } from "../lib/types";
import { useStore } from "../lib/store";
import { LabelChip, PriorityBadge } from "./ui";

export default function QuickAdd({ projectId, status, open, setOpen }: { projectId: string; status: Status; open: boolean; setOpen: (v: boolean) => void }) {
  const { dispatch } = useStore();
  const [text, setText] = useState("");
  const p = parseQuickAdd(text);

  const submit = () => {
    if (!p.title.trim()) return;
    dispatch({ type: "add", task: { projectId, status, title: p.title, description: "", labels: p.labels, assignees: p.assignees, priority: p.priority ?? "medium", due: p.due, checklist: [] } });
    setText("");
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 rounded-xl border-2 border-dashed border-ink/40 px-3 py-2 text-sm font-semibold text-muted hover:border-ink hover:bg-panel hover:text-ink">
      <Plus size={16} strokeWidth={2.5} /> Add task
    </button>
  );
  return (
    <div className="rounded-xl border-2 border-ink bg-panel p-2 shadow-[3px_3px_0_var(--c-orange)]">
      <textarea autoFocus value={text} rows={2} aria-label="New task" placeholder="Task title… try #bug @raka !high ^fri"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === "Escape") { e.stopPropagation(); setOpen(false); setText(""); }
        }}
        className="w-full resize-none bg-transparent px-1 text-sm font-medium outline-none placeholder:text-muted focus-visible:outline-none" />
      {(p.labels.length > 0 || p.assignees.length > 0 || p.priority || p.due) && (
        <div className="mb-2 flex flex-wrap items-center gap-1 px-1" data-testid="quickadd-preview">
          {p.labels.map((l) => <LabelChip key={l} id={l} />)}
          {p.priority && <PriorityBadge p={p.priority} withText />}
          {p.assignees.map((a) => <span key={a} className="rounded-md border-2 border-ink bg-soft px-1.5 text-[11px] leading-[18px] font-bold">@{memberById(a)?.name}</span>)}
          {p.due && <span className="rounded-md border-2 border-ink bg-soft px-1.5 text-[11px] leading-[18px] font-bold">due {dueLabel(p.due)}</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="pl-1 text-[11px] text-muted">Enter to add · Esc to close</span>
        <button onClick={submit} disabled={!p.title.trim()} className="brut-sm press rounded-lg bg-yellow px-2.5 py-1 text-[13px] font-bold text-on disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}
