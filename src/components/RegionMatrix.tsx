import { useMemo, useState } from "react";
import { ArrowRightLeft, Check, ChevronDown, ChevronUp, Globe2, Sparkles } from "lucide-react";
import type {
  Currency,
  PricingData,
  PurchaseOption,
  Resource,
  SupportPlan,
} from "../types";
import { calculateSummary } from "../lib/calc";
import { formatMoney } from "../lib/format";
import { migrateResourceToRegion } from "../lib/resources";
import { cn } from "./Primitives";

interface RegionMatrixProps {
  resources: Resource[];
  pricing: PricingData;
  currentMonthlyUsd: number;
  activeRegionId: string;
  purchaseOption: PurchaseOption;
  supportPlan: SupportPlan;
  includeVat: boolean;
  currency: Currency;
  fx: number;
  onMigrateAll: (regionId: string) => void;
}

export function RegionMatrix({
  resources,
  pricing,
  currentMonthlyUsd,
  activeRegionId,
  purchaseOption,
  supportPlan,
  includeVat,
  currency,
  fx,
  onMigrateAll,
}: RegionMatrixProps) {
  const [expanded, setExpanded] = useState(true);

  const rows = useMemo(() => {
    if (!resources.length) return [];
    const computed = pricing.meta.regions.map((reg) => {
      const migrated = resources.map((r) => migrateResourceToRegion(r, reg.id, pricing));
      const summary = calculateSummary(migrated, pricing, purchaseOption, supportPlan, includeVat);
      const diffUsd = summary.monthlyUsd - currentMonthlyUsd;
      const diffPct = currentMonthlyUsd > 0 ? (diffUsd / currentMonthlyUsd) * 100 : 0;
      const allInThisRegion = resources.every((r) => r.regionId === reg.id);
      return {
        ...reg,
        monthlyUsd: summary.monthlyUsd,
        diffUsd,
        diffPct,
        allInThisRegion,
      };
    });

    const minUsd = Math.min(...computed.map((item) => item.monthlyUsd));
    const maxUsd = Math.max(...computed.map((item) => item.monthlyUsd), 1);

    return computed.map((item) => ({
      ...item,
      isCheapest: Math.abs(item.monthlyUsd - minUsd) < 0.01,
      ratio: (item.monthlyUsd / maxUsd) * 100,
    }));
  }, [resources, pricing, currentMonthlyUsd, purchaseOption, supportPlan, includeVat]);

  if (!resources.length) return null;

  const cheapest = rows.find((r) => r.isCheapest);
  const maxSavingsUsd = cheapest ? Math.max(0, currentMonthlyUsd - cheapest.monthlyUsd) : 0;

  return (
    <section className="no-print rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card sm:p-5 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
            <Globe2 size={17} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                8대 글로벌 리전 실시간 비용 비교 매트릭스
              </h2>
              {cheapest && maxSavingsUsd > 0.5 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={10} />
                  {cheapest.flag} {cheapest.label} 전환 시 월 {formatMoney(maxSavingsUsd, currency, fx)} 절감
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">
              현재 {resources.length}개 리소스 아키텍처를 각 리전에 배포했을 때의 월간 총액(약정·Support·VAT 포함)을 한눈에 비교합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          {expanded ? (
            <>
              접기 <ChevronUp size={13} />
            </>
          ) : (
            <>
              8개 리전 비교 펼치기 <ChevronDown size={13} />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((item) => {
            const isActive = item.allInThisRegion || item.id === activeRegionId;
            return (
              <div
                key={item.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border p-3 transition",
                  item.allInThisRegion
                    ? "border-indigo-500/50 bg-indigo-500/[0.04] dark:border-indigo-400/40 dark:bg-indigo-500/[0.08]"
                    : item.isCheapest
                      ? "border-emerald-500/35 bg-emerald-500/[0.03] hover:border-emerald-500/60 dark:border-emerald-500/30 dark:bg-emerald-500/[0.05]"
                      : "border-zinc-200/80 bg-zinc-50/50 hover:border-zinc-300 dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/15",
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.flag}</span>
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        {item.id}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {item.allInThisRegion ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          <Check size={9} /> 현재 구성
                        </span>
                      ) : item.isCheapest ? (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          최저가
                        </span>
                      ) : null}

                      {!item.allInThisRegion && Math.abs(item.diffPct) >= 0.1 && (
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold tabular-nums",
                            item.diffPct < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {item.diffPct > 0 ? `+${item.diffPct.toFixed(1)}%` : `${item.diffPct.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2.5 font-mono text-sm font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                    {formatMoney(item.monthlyUsd, currency, fx)}
                    <span className="ml-1 text-[10px] font-normal text-zinc-400">/월</span>
                  </p>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        item.allInThisRegion
                          ? "bg-indigo-500"
                          : item.isCheapest
                            ? "bg-emerald-500"
                            : "bg-zinc-400 dark:bg-zinc-500",
                      )}
                      style={{ width: `${Math.max(12, item.ratio)}%` }}
                    />
                  </div>
                </div>

                {!item.allInThisRegion && (
                  <button
                    type="button"
                    onClick={() => onMigrateAll(item.id)}
                    className={cn(
                      "mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-bold transition",
                       isActive
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-white",
                    )}
                  >
                    <ArrowRightLeft size={10} />이 리전으로 일괄 전환
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
