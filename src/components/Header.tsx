import { FileText, Moon, Plus, Sparkles, Sun } from "lucide-react";
import type { Currency } from "../types";
import { useCountUp } from "../hooks/useCountUp";
import { formatMoney } from "../lib/format";
import { cn } from "./Primitives";

interface HeaderProps {
  totalUsd: number;
  currency: Currency;
  fx: number;
  onCurrencyChange: (currency: Currency) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onAdd: () => void;
}

export function Header({
  totalUsd,
  currency,
  fx,
  onCurrencyChange,
  theme,
  onToggleTheme,
  onAdd,
}: HeaderProps) {
  const animated = useCountUp(totalUsd, 850);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#f6f6f8]/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#08080b]/80">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="group flex min-w-0 items-center gap-2.5" aria-label="AWS Cost Studio 홈">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-glow">
            <Sparkles size={17} strokeWidth={2.2} />
            <span className="absolute inset-x-0 bottom-0 h-px bg-white/40" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-zinc-900 dark:text-white">
                Cost Studio
              </span>
              <span className="rounded border border-zinc-200 bg-white px-1.5 py-px text-[9px] font-bold tracking-[0.12em] text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                AWS
              </span>
            </span>
            <span className="hidden text-[10px] font-medium tracking-[0.14em] text-zinc-400 uppercase sm:block dark:text-zinc-600">
              Pricing workspace
            </span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 rounded-full border border-zinc-200/80 bg-white/80 py-1.5 pr-1.5 pl-3 shadow-card backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-none">
            <span className="hidden text-[10px] font-semibold tracking-[0.16em] text-zinc-400 uppercase lg:block dark:text-zinc-500">
              월 예상
            </span>
            <span className="max-w-[150px] truncate font-mono text-[13px] font-semibold tracking-tight text-zinc-900 tabular-nums sm:max-w-none sm:text-sm dark:text-white">
              {formatMoney(animated, currency, fx)}
            </span>
            <div className="flex rounded-full bg-zinc-100 p-0.5 dark:bg-black/30" role="group" aria-label="통화 선택">
              {(["USD", "KRW"] as Currency[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={currency === option}
                  onClick={() => onCurrencyChange(option)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide transition",
                    currency === option
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-white/15 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-white"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <a
            href="#export"
            className="hidden h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 sm:inline-flex dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            <FileText size={14} />
            리포트
          </a>

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_24px_-10px_rgba(79,70,229,.9)] transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f6f8] dark:focus-visible:ring-offset-[#08080b]"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span className="hidden sm:inline">서비스 추가</span>
            <span className="sr-only sm:hidden">서비스 추가</span>
          </button>
        </div>
      </div>
    </header>
  );
}
