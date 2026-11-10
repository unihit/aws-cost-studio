import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { clamp, formatNumber } from "../lib/format";

export const cn = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

/* --------------------------------- Stepper -------------------------------- */

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: "sm" | "md";
  label?: string;
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  size = "md",
  label = "수량",
}: StepperProps) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200",
        compact ? "h-8" : "h-10",
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={`${label} 감소`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step, min, max))}
        className={cn(
          "grid place-items-center rounded-l-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Minus size={compact ? 13 : 15} strokeWidth={2.2} />
      </button>
      <span
        className={cn(
          "text-center font-semibold tabular-nums text-zinc-900 dark:text-white",
          compact ? "w-9 text-xs" : "w-12 text-sm",
        )}
      >
        {formatNumber(value)}
      </span>
      <button
        type="button"
        aria-label={`${label} 증가`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step, min, max))}
        className={cn(
          "grid place-items-center rounded-r-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Plus size={compact ? 13 : 15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/* ------------------------------ Number input ------------------------------ */

interface InlineNumberProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
}

function InlineNumber({ value, onChange, min, max, step, className, ariaLabel }: InlineNumberProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text.replace(/,/g, "").trim());
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : min;
    onChange(next);
    setText(String(next));
  };

  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      value={text}
      step={step}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = Number(event.target.value.replace(/,/g, "").trim());
        if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={cn(
        "w-24 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-indigo-400",
        className,
      )}
    />
  );
}

/* ------------------------------- Range field ------------------------------ */

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  format?: (value: number) => string;
}

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  format,
}: RangeFieldProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{hint}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <InlineNumber value={value} onChange={onChange} min={min} max={max} step={step} ariaLabel={label} />
          {unit && <span className="w-10 text-xs text-zinc-500 dark:text-zinc-500">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider w-full"
        style={{ "--pct": `${clamp(pct, 0, 100)}%` } as CSSProperties}
      />
      <div className="flex justify-between text-[11px] tabular-nums text-zinc-400 dark:text-zinc-600">
        <span>{format ? format(min) : formatNumber(min)}</span>
        <span>{format ? format(max) : formatNumber(max)}</span>
      </div>
    </div>
  );
}

/* ------------------------------ Number field ------------------------------ */

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
}

export function NumberField({ label, value, onChange, min, max, step, unit, hint }: NumberFieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{label}</label>
        {hint && <span className="text-[11px] text-zinc-500 dark:text-zinc-500">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <InlineNumber value={value} onChange={onChange} min={min} max={max} step={step} ariaLabel={label} className="w-full" />
        {unit && <span className="text-xs text-zinc-500 dark:text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

/* -------------------------------- Segmented ------------------------------- */

interface SegmentedProps<T extends string> {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-100/70 p-1 dark:border-white/10 dark:bg-black/20"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-white/[0.12] dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Toggle --------------------------------- */

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>}
      </div>
      <span
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn(
          "pointer-events-none relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out",
          checked ? "bg-indigo-600" : "bg-zinc-300 dark:bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </div>
  );
}

/* ---------------------------------- Chip ---------------------------------- */

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
}

export function Chip({ active, onClick, children, title }: ChipProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
