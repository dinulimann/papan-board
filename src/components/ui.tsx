import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsUp, ChevronUp, Equal, ChevronDown, Globe, ReceiptText, X } from "lucide-react";
import { labelById, memberById, type Priority, type Project } from "../lib/types";

export function ProjectIcon({ project, size = 28 }: { project: Project; size?: number }) {
  const Icon = project.icon === "globe" ? Globe : ReceiptText;
  return <span className="grid shrink-0 place-items-center rounded-lg border-2 border-ink text-on" style={{ width: size, height: size, background: project.color }}><Icon size={size * 0.55} strokeWidth={2.4} /></span>;
}

export function Button({ variant = "default", size = "md", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "ghost"; size?: "sm" | "md" }) {
  const v = {
    default: "brut-sm press bg-panel",
    primary: "brut-sm press bg-yellow text-on",
    danger: "brut-sm press bg-panel text-danger",
    ghost: "border-2 border-transparent hover:border-ink hover:bg-soft",
  }[variant];
  const s = size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-3.5 text-sm";
  return <button {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 ${s} ${v} ${className}`} />;
}

export function Avatar({ id, size = 26, ring = true }: { id: string; size?: number; ring?: boolean }) {
  const m = memberById(id);
  if (!m) return null;
  return (
    <span title={m.name} className={`grid shrink-0 place-items-center rounded-full font-bold text-on ${ring ? "border-2 border-ink" : ""}`} style={{ width: size, height: size, background: m.color, fontSize: size * 0.42 }}>
      {m.name[0]}
    </span>
  );
}

export function AvatarStack({ ids, size = 26 }: { ids: string[]; size?: number }) {
  return <span className="flex -space-x-2">{ids.map((id) => <Avatar key={id} id={id} size={size} />)}</span>;
}

export function LabelChip({ id }: { id: string }) {
  const l = labelById(id);
  if (!l) return null;
  return <span className="inline-flex items-center rounded-md border-2 border-ink px-1.5 text-[11px] leading-[18px] font-bold text-on" style={{ background: l.color }}>{l.name}</span>;
}

const PRIO = {
  urgent: { icon: ChevronsUp, cls: "bg-danger text-white", text: "Urgent" },
  high: { icon: ChevronUp, cls: "bg-orange text-on", text: "High" },
  medium: { icon: Equal, cls: "bg-soft text-ink", text: "Medium" },
  low: { icon: ChevronDown, cls: "bg-soft text-muted", text: "Low" },
} as const;
export function PriorityBadge({ p, withText }: { p: Priority; withText?: boolean }) {
  const { icon: Icon, cls, text } = PRIO[p];
  return (
    <span title={`${text} priority`} className={`inline-flex h-[22px] items-center gap-0.5 rounded-md border-2 border-ink px-1 text-[11px] font-bold ${cls}`}>
      <Icon size={13} strokeWidth={3} />{withText && <span className="pr-0.5">{text}</span>}
    </span>
  );
}
export const priorityText = (p: Priority) => PRIO[p].text;

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border-2 border-ink bg-panel px-1.5 font-mono text-[11px] leading-[18px]">{children}</kbd>;
}

/** Closes on Escape and keeps Tab focus inside while open. */
function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? []).filter((x) => !x.hasAttribute("disabled"));
    setTimeout(() => (el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables(); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, label, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; label: string; children: ReactNode; width?: string }) {
  const ref = useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <div className="fixed inset-0 bg-[#141414]/45" onClick={onClose} />
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={label} initial={{ y: 24, rotate: -0.6 }} animate={{ y: 0, rotate: 0 }} exit={{ y: 12, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 380 }}
            className={`brut relative w-full ${width} rounded-2xl bg-panel`}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} aria-label="Close" className="grid size-8 place-items-center rounded-lg border-2 border-transparent hover:border-ink hover:bg-soft"><X size={18} /></button>;
}

export function Popover({ trigger, children, align = "left", label }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" aria-label={label} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
            className={`brut absolute top-full z-50 mt-2 min-w-52 rounded-xl bg-panel p-1.5 ${align === "right" ? "right-0" : "left-0"}`}>
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuCheck({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button role="menuitemcheckbox" aria-checked={on} onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium hover:bg-soft">
      <span className={`grid size-4 shrink-0 place-items-center rounded border-2 border-ink text-[10px] font-black ${on ? "bg-ink text-bg" : ""}`}>{on && "✓"}</span>{children}
    </button>
  );
}

export function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("papan:theme", next ? "dark" : "light"); } catch { /* ignore */ }
    setDark(next);
  };
  return [dark, toggle];
}
