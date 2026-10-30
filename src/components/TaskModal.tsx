import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { ago } from "../lib/dates";
import { COLUMNS, LABELS, MEMBERS, PRIORITIES, type Task } from "../lib/types";
import { Avatar, Button, CloseButton, LabelChip, Modal, ProjectIcon, priorityText } from "./ui";
import { DueChip } from "./TaskCard";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">{label}</p>{children}</div>;
}
const select = "h-9 w-full rounded-lg border-2 border-ink bg-panel px-2 text-sm font-semibold";

function Body({ task, onClose }: { task: Task; onClose: () => void }) {
  const { dispatch, board } = useStore();
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [item, setItem] = useState("");
  const [comment, setComment] = useState("");
  useEffect(() => { setTitle(task.title); setDesc(task.description); }, [task.title, task.description]);
  const update = (patch: Partial<Task>, log?: string) => dispatch({ type: "update", id: task.id, patch, log });
  const project = board.projects.find((p) => p.id === task.projectId)!;
  const done = task.checklist.filter((c) => c.done).length;

  const saveTitle = () => { const t = title.trim(); if (!t) setTitle(task.title); else if (t !== task.title) update({ title: t }, "Renamed"); };
  const addItem = () => { const t = item.trim(); if (!t) return; update({ checklist: [...task.checklist, { id: `c${Date.now()}`, text: t, done: false }] }); setItem(""); };
  const addComment = () => { const t = comment.trim(); if (!t) return; update({ comments: [...task.comments, { id: `m${Date.now()}`, author: "you", text: t, at: new Date().toISOString() }] }); setComment(""); };
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <>
      <div className="flex items-center gap-2 border-b-2 border-ink px-5 py-3">
        <ProjectIcon project={project} size={24} />
        <span className="text-sm font-semibold text-muted">{project.name}</span>
        <span className="text-muted">/</span>
        <span className="font-mono text-sm">{task.id}</span>
        <span className="ml-auto"><CloseButton onClick={onClose} /></span>
      </div>
      <div className="grid md:grid-cols-[1fr_250px]">
        <div className="min-w-0 space-y-6 p-5 md:border-r-2 md:border-ink">
          <textarea data-autofocus value={title} rows={2} aria-label="Title" onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            className="w-full resize-none rounded-lg border-2 border-transparent bg-transparent px-1 text-xl leading-snug font-bold outline-none hover:border-ink/20 focus:border-ink" />
          <Field label="Description">
            <textarea value={desc} rows={4} aria-label="Description" placeholder="Add more detail…" onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== task.description && update({ description: desc }, "Edited the description")}
              className="w-full resize-y rounded-lg border-2 border-ink bg-soft p-2.5 text-sm leading-relaxed outline-none focus:bg-panel" />
          </Field>
          <Field label={`Checklist ${task.checklist.length ? `· ${done}/${task.checklist.length}` : ""}`}>
            {task.checklist.length > 0 && <div className="mb-2 h-2 overflow-hidden rounded-full border-2 border-ink bg-soft"><div className="h-full bg-lime transition-[width]" style={{ width: `${(done / task.checklist.length) * 100}%` }} /></div>}
            <ul className="space-y-1">
              {task.checklist.map((c) => (
                <li key={c.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-soft">
                  <input type="checkbox" checked={c.done} aria-label={c.text} onChange={() => update({ checklist: task.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })} className="size-4 accent-[#141414]" />
                  <span className={`flex-1 text-sm ${c.done ? "text-muted line-through" : ""}`}>{c.text}</span>
                  <button aria-label={`Remove ${c.text}`} onClick={() => update({ checklist: task.checklist.filter((x) => x.id !== c.id) })} className="text-muted opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger"><X size={15} /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Add an item" aria-label="New checklist item" className="h-9 flex-1 rounded-lg border-2 border-ink bg-panel px-2.5 text-sm outline-none" />
              <Button size="sm" className="h-9" onClick={addItem} aria-label="Add checklist item"><Plus size={16} /></Button>
            </div>
          </Field>
          <Field label={`Comments · ${task.comments.length}`}>
            <ul className="space-y-3">
              {task.comments.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar id={c.author} size={28} />
                  <div className="min-w-0 flex-1 rounded-lg border-2 border-ink bg-soft px-3 py-2">
                    <p className="text-xs"><b>{MEMBERS.find((m) => m.id === c.author)?.name}</b> <span className="text-muted">· {ago(c.at)}</span></p>
                    <p className="mt-0.5 text-sm break-words">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2.5">
              <Avatar id="you" size={28} />
              <div className="flex-1">
                <textarea value={comment} rows={2} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment(); }} placeholder="Write a comment… (Ctrl+Enter to send)" aria-label="New comment"
                  className="w-full resize-none rounded-lg border-2 border-ink bg-panel p-2.5 text-sm outline-none" />
                <Button size="sm" variant="primary" className="mt-1.5" onClick={addComment} disabled={!comment.trim()}>Comment</Button>
              </div>
            </div>
          </Field>
        </div>

        <aside className="space-y-5 border-t-2 border-ink bg-soft/50 p-5 md:border-t-0">
          <Field label="Status">
            <select className={select} value={task.status} aria-label="Status" onChange={(e) => update({ status: e.target.value as Task["status"] })}>
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className={select} value={task.priority} aria-label="Priority" onChange={(e) => update({ priority: e.target.value as Task["priority"] }, `Priority set to ${priorityText(e.target.value as Task["priority"])}`)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{priorityText(p)}</option>)}
            </select>
          </Field>
          <Field label="Assignees">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assignees">
              {MEMBERS.map((m) => {
                const on = task.assignees.includes(m.id);
                return (
                  <button key={m.id} aria-pressed={on} title={m.name} aria-label={m.name} onClick={() => update({ assignees: toggleIn(task.assignees, m.id) }, `${on ? "Unassigned" : "Assigned"} ${m.name}`)}
                    className={`rounded-full transition ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--soft)]" : "opacity-35 grayscale hover:opacity-80"}`}>
                    <Avatar id={m.id} size={30} />
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Labels">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Labels">
              {LABELS.map((l) => {
                const on = task.labels.includes(l.id);
                return <button key={l.id} aria-pressed={on} onClick={() => update({ labels: toggleIn(task.labels, l.id) })} className={on ? "" : "opacity-35 hover:opacity-80"}><LabelChip id={l.id} /></button>;
              })}
            </div>
          </Field>
          <Field label="Due date">
            <div className="flex items-center gap-2">
              <input type="date" value={task.due ?? ""} aria-label="Due date" onChange={(e) => update({ due: e.target.value || null }, e.target.value ? `Due date set to ${e.target.value}` : "Removed the due date")} className={`${select} flex-1`} />
            </div>
            <div className="mt-2"><DueChip task={task} /></div>
          </Field>
          <Field label="Activity">
            <ol className="space-y-2 border-l-2 border-ink pl-3">
              {[...task.activity].reverse().slice(0, 6).map((a, i) => <li key={i} className="text-xs"><p className="font-semibold">{a.text}</p><p className="text-muted">{ago(a.at)}</p></li>)}
            </ol>
          </Field>
          <Button variant="danger" size="sm" className="w-full" onClick={() => { onClose(); dispatch({ type: "delete", id: task.id }, `${task.id} deleted`); }}><Trash2 size={14} /> Delete task</Button>
        </aside>
      </div>
    </>
  );
}

export default function TaskModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { board } = useStore();
  const task = id ? board.tasks[id] : undefined;
  return (
    <Modal open={!!task} onClose={onClose} label={task ? `${task.id}: ${task.title}` : "Task"} width="max-w-4xl">
      {task && <Body key={task.id} task={task} onClose={onClose} />}
    </Modal>
  );
}
