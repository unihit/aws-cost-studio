import { useMemo } from "react";
import { ArrowUpRight, ChevronDown, Globe2, Sparkles } from "lucide-react";
import type { Currency, PricingData } from "../types";
import { calculateResource, HOURS_PER_MONTH } from "../lib/calc";
import { formatMoney } from "../lib/format";
import { PRESETS, presetTotal, type Preset } from "../lib/presets";
import { cn } from "./Primitives";

interface HeroProps {
  pricing: PricingData;
  regionId: string;
  onRegionChange: (regionId: string) => void;
  currency: Currency;
  fx: number;
  onApplyPreset: (preset: Preset) => void;
}

export function Hero({ pricing, regionId, onRegionChange, currency, fx, onApplyPreset }: HeroProps) {
  const totals = useMemo(
    () =>
      Object.fromEntries(
        PRESETS.map((preset) => [
          preset.id,
          presetTotal(preset, regionId, (resource) => calculateResource(resource, pricing)),
        ]),
      ) as Record<string, number>,
    [pricing, regionId],
  );

  const snapshotDate = new Date(pricing.meta.generatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 dark:border-white/[0.06]">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute top-10 right-0 h-64 w-64 rounded-full bg-amber-400/10 blur-[90px] dark:bg-amber-400/10" />

      <div className="relative mx-auto max-w-[1440px] px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              실측 요율 스냅샷 · {snapshotDate}
            </div>

            <h1 className="mt-5 text-[2rem] leading-[1.08] font-bold tracking-[-0.035em] text-zinc-900 sm:text-[2.9rem] dark:text-white">
              AWS 비용, 설계 단계에서
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                정확하게
              </span>{" "}
              확인하세요.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-[15px] dark:text-zinc-400">
              AWS Pricing Calculator의 실제 미터 요율을 그대로 스냅샷했습니다. 리전을 고르고, 구성을
              조정하면 월간 비용과 절감 기회가 실시간으로 다시 계산됩니다.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-500" /> 7개 서비스 · 8개 리전
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>월 {HOURS_PER_MONTH}시간 기준</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>외부 API 호출 없이 오프라인 계산</span>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 shadow-card backdrop-blur sm:max-w-[290px] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none">
            <div className="mb-2 flex items-center gap-2">
              <Globe2 size={14} className="text-indigo-500" />
              <span className="text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-500">
                기본 리전
              </span>
            </div>
            <div className="relative">
              <select
                aria-label="기본 리전 선택"
                value={regionId}
                onChange={(event) => onRegionChange(event.target.value)}
                className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
              >
                {pricing.meta.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label} · {region.short}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
              />
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
              새 리소스와 프리셋에 적용됩니다. 카드별 리전은 개별 수정할 수 있습니다.
            </p>
          </div>
        </div>

        <div id="presets" className="mt-10 scroll-mt-24">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">빠른 시작 프리셋</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                검증된 구성으로 시작하고 필요한 부분만 바꿔보세요.
              </p>
            </div>
            <span className="hidden text-[11px] text-zinc-400 sm:block dark:text-zinc-600">현재 구성 교체 · 되돌리기 가능</span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none dark:hover:border-indigo-400/40"
                >
                  <span className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", preset.gradient)} />
                  <span className="relative flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/60 bg-white/80 text-zinc-700 shadow-sm transition group-hover:scale-105 dark:border-white/10 dark:bg-white/10 dark:text-white">
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-zinc-900 dark:text-white">{preset.title}</span>
                        <ArrowUpRight
                          size={15}
                          className="shrink-0 text-zinc-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500"
                        />
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {preset.subtitle}
                      </span>
                    </span>
                  </span>
                  <span className="relative mt-4 block text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {preset.description}
                  </span>
                  <span className="relative mt-4 flex items-baseline justify-between border-t border-zinc-900/[0.06] pt-3 dark:border-white/[0.08]">
                    <span className="font-mono text-lg font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                      {formatMoney(totals[preset.id] ?? 0, currency, fx)}
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.12em] text-zinc-400 uppercase group-hover:text-indigo-500 dark:text-zinc-500">
                      적용하기
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
