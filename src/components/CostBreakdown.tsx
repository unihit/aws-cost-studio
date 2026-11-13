import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, PieChart as PieIcon, Receipt, ShieldCheck, Target, X } from "lucide-react";
import type {
  CostSummary,
  Currency,
  PurchaseOption,
  ServiceKind,
  SupportPlan,
} from "../types";
import { formatMoney, percent } from "../lib/format";
import { PURCHASE_OPTIONS, SERVICE_COLORS, SERVICES, SUPPORT_PLANS } from "../lib/services";
import { cn } from "./Primitives";

interface CostBreakdownProps {
  summary: CostSummary;
  currency: Currency;
  fx: number;
  purchaseOption: PurchaseOption;
  supportPlan: SupportPlan;
  onSupportPlanChange: (plan: SupportPlan) => void;
  includeVat: boolean;
  onIncludeVatChange: (include: boolean) => void;
  budgetUsd: number;
  onBudgetUsdChange: (budgetUsd: number) => void;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { color?: string; title?: string };
  }>;
  currency: Currency;
  fx: number;
}

function ChartTooltip({ active, payload, currency, fx }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lift backdrop-blur dark:border-white/10 dark:bg-[#15151b]/95">
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: item.payload?.color ?? "#6366f1" }}
        />
        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          {item.payload?.title ?? item.name}
        </span>
      </div>
      <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
        {formatMoney(item.value ?? 0, currency, fx)}
      </p>
    </div>
  );
}

export function CostBreakdown({
  summary,
  currency,
  fx,
  purchaseOption,
  supportPlan,
  onSupportPlanChange,
  includeVat,
  onIncludeVatChange,
  budgetUsd,
  onBudgetUsdChange,
}: CostBreakdownProps) {
  const data = Object.entries(summary.byKind)
    .filter(([, value]) => value > 0)
    .map(([kind, value]) => {
      const serviceKind = kind as ServiceKind;
      const meta = SERVICES[serviceKind];
      return {
        id: kind,
        title: meta.title.replace("Amazon ", "").replace("AWS ", ""),
        value,
        color: SERVICE_COLORS[serviceKind] ?? "#a1a1aa",
      };
    })
    .sort((a, b) => b.value - a.value);

  const spDiscountUsd = Math.max(0, summary.onDemandMonthlyUsd - summary.monthlyUsd);
  const purchaseMeta = PURCHASE_OPTIONS.find((item) => item.value === purchaseOption);
  const budgetRatio = budgetUsd > 0 ? (summary.monthlyUsd / budgetUsd) * 100 : 0;
  const isOverBudget = budgetUsd > 0 && summary.monthlyUsd > budgetUsd;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">비용 구성</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">
            서비스별 월간 비중 · {purchaseMeta?.shortLabel ?? "On-Demand"}
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
          {data.length}개 서비스
        </span>
      </div>

      {/* 청구 옵션: AWS Support Plan & VAT 10% */}
      <div className="no-print mt-3.5 space-y-2 rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-2.5 dark:border-white/[0.07] dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            <ShieldCheck size={12} className="text-indigo-500" /> AWS Support 플랜
          </span>
          <button
            type="button"
            aria-pressed={includeVat}
            onClick={() => onIncludeVatChange(!includeVat)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition",
              includeVat
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400",
            )}
          >
            <Receipt size={10} /> 부가세(VAT) 10% {includeVat ? "포함됨" : "포함"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {SUPPORT_PLANS.map((plan) => {
            const active = supportPlan === plan.value;
            return (
              <button
                key={plan.value}
                type="button"
                onClick={() => onSupportPlanChange(plan.value)}
                title={plan.hint}
                className={cn(
                  "rounded-lg py-1 text-center text-[10px] font-bold transition",
                  active
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-indigo-600 dark:text-white dark:ring-0"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {plan.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {spDiscountUsd > 0.01 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-3 py-2 text-[11px]">
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
            약정 할인 적용됨 ({purchaseMeta?.shortLabel})
          </span>
          <span className="font-mono font-bold text-indigo-700 tabular-nums dark:text-indigo-300">
            -{formatMoney(spDiscountUsd, currency, fx)}/월
          </span>
        </div>
      )}

      {data.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-10 dark:border-white/10">
          <PieIcon size={26} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
          <p className="mt-2 text-xs font-medium text-zinc-400 dark:text-zinc-600">비용 데이터가 없습니다</p>
          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-600">
            리소스를 추가하면 차트가 채워집니다.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mt-2 h-[212px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="title"
                  innerRadius={66}
                  outerRadius={92}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={650}
                >
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} fx={fx} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold tracking-[0.16em] text-zinc-400 uppercase dark:text-zinc-600">
                월 합계
              </span>
              <span className="mt-0.5 max-w-[126px] truncate font-mono text-lg font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                {formatMoney(summary.monthlyUsd, currency, fx)}
              </span>
              <span className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-600">/ month</span>
            </div>
          </div>

          <div className="mt-1 space-y-1">
            {data.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                  {entry.title}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                  {percent(entry.value, summary.subtotalUsd)}%
                </span>
                <span className="w-[78px] text-right font-mono text-[11px] font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
                  {formatMoney(entry.value, currency, fx)}
                </span>
              </div>
            ))}
          </div>

          {(summary.supportUsd > 0 || summary.vatUsd > 0) && (
            <div className="mt-2 space-y-1 border-t border-dashed border-zinc-200 pt-2 text-[11px] dark:border-white/10">
              <div className="flex items-center justify-between px-1.5 text-zinc-500 dark:text-zinc-400">
                <span>리소스 소계 (Subtotal)</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(summary.subtotalUsd, currency, fx)}
                </span>
              </div>
              {summary.supportUsd > 0 && (
                <div className="flex items-center justify-between px-1.5 text-zinc-500 dark:text-zinc-400">
                  <span>AWS Support ({supportPlan.toUpperCase()})</span>
                  <span className="font-mono tabular-nums">
                    +{formatMoney(summary.supportUsd, currency, fx)}
                  </span>
                </div>
              )}
              {summary.vatUsd > 0 && (
                <div className="flex items-center justify-between px-1.5 text-zinc-500 dark:text-zinc-400">
                  <span>부가세 (VAT 10%)</span>
                  <span className="font-mono tabular-nums">
                    +{formatMoney(summary.vatUsd, currency, fx)}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 목표 예산(Budget) 게이지 & 초과 경고 */}
      <div className="mt-4 rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            <Target size={12} className="text-indigo-500" /> 월 목표 예산 (USD)
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] text-zinc-400">$</span>
            <input
              type="number"
              aria-label="월 목표 예산 USD"
              min={0}
              step={100}
              value={budgetUsd || ""}
              placeholder="미설정"
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                onBudgetUsdChange(Number.isFinite(v) && v >= 0 ? v : 0);
              }}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-right font-mono text-xs font-bold text-zinc-900 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-black/30 dark:text-white"
            />
            {budgetUsd > 0 && (
              <button
                type="button"
                onClick={() => onBudgetUsdChange(0)}
                aria-label="목표 예산 초기화"
                title="예산 초기화"
                className="grid h-5 w-5 place-items-center rounded text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {currency === "KRW" && budgetUsd > 0 && (
          <p className="mt-1 text-right font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
            ≈ {formatMoney(budgetUsd, "KRW", fx)}
          </p>
        )}

        {budgetUsd > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-bold",
                  isOverBudget
                    ? "text-rose-600 dark:text-rose-400"
                    : budgetRatio >= 80
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {isOverBudget && <AlertTriangle size={11} />}
                {isOverBudget
                  ? `예산 초과 (+${formatMoney(summary.monthlyUsd - budgetUsd, currency, fx)})`
                  : `예산 여유 (${formatMoney(budgetUsd - summary.monthlyUsd, currency, fx)} 남음)`}
              </span>
              <span className="font-mono font-bold text-zinc-600 tabular-nums dark:text-zinc-300">
                {budgetRatio.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isOverBudget
                    ? "bg-rose-500"
                    : budgetRatio >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(100, budgetRatio)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-white/[0.06]">
        <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-white/[0.03]">
          <p className="text-[9px] font-bold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
            연간 예상
          </p>
          <p className="mt-0.5 truncate font-mono text-xs font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
            {formatMoney(summary.annualUsd, currency, fx)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-white/[0.03]">
          <p className="text-[9px] font-bold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
            일 평균
          </p>
          <p className="mt-0.5 truncate font-mono text-xs font-semibold text-zinc-800 tabular-nums dark:text-zinc-200">
            {formatMoney(summary.monthlyUsd / 30, currency, fx)}
          </p>
        </div>
      </div>
    </section>
  );
}
