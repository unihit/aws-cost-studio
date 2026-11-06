import { Copy, Pencil, Trash2 } from "lucide-react";
import type { Currency, PricingData, Resource } from "../types";
import { getRegion } from "../lib/calc";
import { formatMoney, formatUsd } from "../lib/format";
import { hasQty, resourceBadges } from "../lib/resources";
import { ENV_META, SERVICES } from "../lib/services";
import { cn, Stepper } from "./Primitives";

interface ResourceCardProps {
  resource: Resource;
  monthlyUsd: number;
  pricing: PricingData;
  currency: Currency;
  fx: number;
  onEdit: (resource: Resource) => void;
  onDuplicate: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onQty: (resource: Resource, qty: number) => void;
}

export function ResourceCard({
  resource,
  monthlyUsd,
  pricing,
  currency,
  fx,
  onEdit,
  onDuplicate,
  onDelete,
  onQty,
}: ResourceCardProps) {
  const meta = SERVICES[resource.kind];
  const Icon = meta.icon;
  const region = getRegion(pricing, resource.regionId);
  const badges = resourceBadges(resource, pricing).slice(0, 5);
  const envMeta = resource.env ? ENV_META[resource.env] : null;

  return (
    <article className="group relative flex animate-scale-in flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lift dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none dark:hover:border-white/[0.16]">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1", meta.tile)}>
          <Icon size={18} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
              {resource.label || meta.title}
            </h3>
            {envMeta && (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-px text-[9px] font-bold tracking-wider",
                  envMeta.badgeClass,
                )}
              >
                {envMeta.label}
              </span>
            )}
            <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-px text-[9px] font-bold tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              {region.flag} {region.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
            {resource.label ? `${meta.title} · ${meta.eyebrow}` : meta.eyebrow}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            aria-label={`${resource.label || meta.title} 수정`}
            title="수정"
            onClick={() => onEdit(resource)}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label={`${resource.label || meta.title} 복제`}
            title="복제"
            onClick={() => onDuplicate(resource)}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            aria-label={`${resource.label || meta.title} 삭제`}
            title="삭제"
            onClick={() => onDelete(resource)}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span
            key={badge}
            className="max-w-full truncate rounded-md border border-zinc-200/80 bg-zinc-50/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-zinc-400"
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
            월 비용
          </p>
          <p className="mt-0.5 truncate font-mono text-lg font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-white">
            {formatMoney(monthlyUsd, currency, fx)}
          </p>
          {currency === "KRW" && (
            <p className="mt-0.5 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
              {formatUsd(monthlyUsd)} /월
            </p>
          )}
        </div>

        {hasQty(resource) ? (
          <div className="shrink-0">
            <p className="mb-1 text-right text-[9px] font-bold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
              수량
            </p>
            <Stepper
              size="sm"
              value={resource.qty}
              min={1}
              max={999}
              onChange={(qty) => onQty(resource, qty)}
              label={`${meta.title} 수량`}
            />
          </div>
        ) : (
          <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            사용량 기반
          </span>
        )}
      </div>
    </article>
  );
}
