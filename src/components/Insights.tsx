import { ArrowDownRight, Sparkles, Zap } from "lucide-react";
import type { Currency } from "../types";
import type { Insight, InsightAction, InsightTone } from "../lib/insights";
import { formatMoney } from "../lib/format";
import { cn } from "./Primitives";

interface InsightsProps {
  insights: Insight[];
  totalSavingsUsd: number;
  currency: Currency;
  fx: number;
  onApplyAction?: (action: InsightAction) => void;
}

const toneStyles: Record<InsightTone, { dot: string; badge: string; button: string }> = {
  amber: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    button:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    button:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  },
  indigo: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    button:
      "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300",
  },
};

export function Insights({
  insights,
  totalSavingsUsd,
  currency,
  fx,
  onApplyAction,
}: InsightsProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <Sparkles size={14} />
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
              최적화 인사이트
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              실측 요율 비교 및 원클릭 아키텍처 튜닝
            </p>
          </div>
        </div>
      </div>

      {totalSavingsUsd > 0 && (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/[0.04] px-3.5 py-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.14em] text-emerald-700/70 uppercase dark:text-emerald-400/70">
              예상 절감 가능액
            </p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-400">
              {formatMoney(totalSavingsUsd, currency, fx)}
              <span className="ml-1 text-[10px] font-medium text-emerald-600/60 dark:text-emerald-500/60">
                /월
              </span>
            </p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <ArrowDownRight size={16} />
          </span>
        </div>
      )}

      <div className="mt-2 divide-y divide-zinc-100 px-4 dark:divide-white/[0.06]">
        {insights.map((insight) => {
          const tone = toneStyles[insight.tone];
          return (
            <article key={insight.id} className="py-3.5">
              <div className="flex items-start gap-2.5">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs leading-snug font-semibold text-zinc-800 dark:text-zinc-200">
                      {insight.title}
                    </h3>
                    {insight.savingsUsd > 0 && (
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums",
                          tone.badge,
                        )}
                      >
                        -{formatMoney(insight.savingsUsd, currency, fx)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                    {insight.body}
                  </p>
                  {insight.action && insight.actionLabel && onApplyAction && (
                    <button
                      type="button"
                      onClick={() => insight.action && onApplyAction(insight.action)}
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition",
                        tone.button,
                      )}
                    >
                      <Zap size={11} />
                      {insight.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="border-t border-zinc-100 px-5 py-3 text-[10px] leading-relaxed text-zinc-400 dark:border-white/[0.06] dark:text-zinc-600">
        Graviton · Valkey · Arm64 전환은 실제 단가 차이를 계산하며, 버튼 클릭 시 즉시 구성에 반영됩니다.
      </p>
    </section>
  );
}
