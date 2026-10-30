import { addDays, isoDay } from "./dates";
import { LABELS, MEMBERS, PRIORITIES, type Priority } from "./types";

export interface Parsed { title: string; labels: string[]; assignees: string[]; priority: Priority | null; due: string | null; }

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function parseDue(word: string, today: string): string | null {
  if (word === "today") return today;
  if (word === "tomorrow") return addDays(today, 1);
  const rel = /^(\d{1,3})d$/.exec(word);
  if (rel) return addDays(today, Number(rel[1]));
  const wd = WEEKDAYS.indexOf(word.slice(0, 3));
  if (wd >= 0 && WEEKDAYS[wd].startsWith(word.slice(0, 3))) {
    const cur = new Date(`${today}T00:00:00`).getDay();
    return addDays(today, ((wd - cur + 7) % 7) || 7);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(word) && !isNaN(new Date(`${word}T00:00:00`).getTime())) return word;
  return null;
}

/**
 * Reads tokens out of a quick-add line: #label, @person, !priority and ^due
 * (^today, ^tomorrow, ^fri, ^3d, ^2026-11-20). Unknown tokens stay in the title.
 */
export function parseQuickAdd(input: string, today = isoDay(new Date())): Parsed {
  const out: Parsed = { title: "", labels: [], assignees: [], priority: null, due: null };
  const rest: string[] = [];
  for (const word of input.trim().split(/\s+/)) {
    const sigil = word[0], v = word.slice(1).toLowerCase();
    const label = sigil === "#" && LABELS.find((l) => l.id === v || l.name.toLowerCase() === v);
    const member = sigil === "@" && MEMBERS.find((m) => m.id === v || m.name.toLowerCase() === v || (v === "me" && m.id === "you"));
    const prio = sigil === "!" && PRIORITIES.find((p) => p === v || p[0] === v);
    const due = sigil === "^" ? parseDue(v, today) : null;
    if (label) { if (!out.labels.includes(label.id)) out.labels.push(label.id); }
    else if (member) { if (!out.assignees.includes(member.id)) out.assignees.push(member.id); }
    else if (prio) out.priority = prio;
    else if (due) out.due = due;
    else rest.push(word);
  }
  out.title = rest.join(" ");
  return out;
}
