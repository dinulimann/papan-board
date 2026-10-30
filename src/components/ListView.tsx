import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useStore } from "../lib/store";
import { COLUMNS, PRIORITIES, type Task } from "../lib/types";
import { AvatarStack, LabelChip, PriorityBadge } from "./ui";
import { DueChip } from "./TaskCard";

type Sort = "manual" | "priority" | "due" | "title";

export default function ListView({ projectId, visible, onOpen }: { projectId: string; visible: (t: Task) => boolean; onOpen: (id: string) => void }) {
  const { board, dispatch } = useStore();
  const [sort, setSort] = useState<Sort>("manual");
  const [asc, setAsc] = useState(true);
  const cmp = (a: Task, b: Task) => {
    const r = sort === "priority" ? PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
      : sort === "due" ? (a.due ?? "9999").localeCompare(b.due ?? "9999")
      : a.title.localeCompare(b.title);
    return asc ? r : -r;
  };
  const head = (k: Sort, label: string, cls = "") => (
    <th className={`px-3 py-2 font-bold ${cls}`} aria-sort={sort === k ? (asc ? "ascending" : "descending") : undefined}>
      <button onClick={() => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(true); } }} className="inline-flex items-center gap-1 hover:underline">
        {label}{sort === k && (asc ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-5 px-4 pb-10 sm:px-6">
      {COLUMNS.map((col) => {
        let rows = board.order[projectId][col.id].map((id) => board.tasks[id]).filter(visible);
        if (sort !== "manual") rows = [...rows].sort(cmp);
        return (
          <section key={col.id} aria-label={col.title} className="brut overflow-hidden rounded-xl bg-panel">
            <h2 className="flex items-center gap-2 border-b-2 border-ink px-4 py-2 text-[15px] font-bold text-on" style={{ background: col.color }}>
              {col.title} <span className="rounded-md bg-[#141414] px-1.5 text-xs leading-5 text-white">{rows.length}</span>
            </h2>
            {rows.length === 0 ? <p className="px-4 py-4 text-sm text-muted">Nothing here.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] table-fixed text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr className="border-b-2 border-ink/15">
                      <th className="w-24 px-4 py-2 font-bold">ID</th>
                      {head("title", "Task", "w-auto")}
                      <th className="w-48 px-3 font-bold">Labels</th>
                      <th className="w-24 px-3 font-bold">People</th>
                      {head("priority", "Priority", "w-28")}
                      {head("due", "Due", "w-32")}
                      <th className="w-36 px-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id} className="cursor-pointer border-b-2 border-ink/10 last:border-0 hover:bg-soft" onClick={() => onOpen(t.id)}>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted">{t.id}</td>
                        <td className="px-3 font-semibold"><button className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(t.id); }}>{t.title}</button></td>
                        <td className="px-3"><div className="flex flex-wrap gap-1">{t.labels.map((l) => <LabelChip key={l} id={l} />)}</div></td>
                        <td className="px-3"><AvatarStack ids={t.assignees} size={24} /></td>
                        <td className="px-3"><PriorityBadge p={t.priority} withText /></td>
                        <td className="px-3"><DueChip task={t} /></td>
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <select value={t.status} aria-label={`Status of ${t.id}`} onChange={(e) => dispatch({ type: "update", id: t.id, patch: { status: e.target.value as Task["status"] } }, `${t.id} moved to ${COLUMNS.find((c) => c.id === e.target.value)!.title}`)}
                            className="h-8 w-full rounded-lg border-2 border-ink bg-panel px-1.5 text-[13px] font-semibold">
                            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
