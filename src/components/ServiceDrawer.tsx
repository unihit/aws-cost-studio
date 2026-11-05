import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Info,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import type {
  Currency,
  EbsResource,
  Ec2Resource,
  PricingData,
  RdsResource,
  Resource,
  S3Resource,
  ServiceKind,
} from "../types";
import { calculateResource, getRegion } from "../lib/calc";
import { formatMoney, formatNumber, formatUsd } from "../lib/format";
import { createDefaultResource } from "../lib/resources";
import { SERVICE_ORDER, SERVICES } from "../lib/services";
import { Chip, RangeField, NumberField, Segmented, Stepper, Toggle, cn } from "./Primitives";

interface ServiceDrawerProps {
  open: boolean;
  initialKind: ServiceKind | null;
  editing: Resource | null;
  pricing: PricingData;
  defaultRegionId: string;
  currency: Currency;
  fx: number;
  onClose: () => void;
  onSave: (resource: Resource) => void;
}

export function ServiceDrawer({
  open,
  initialKind,
  editing,
  pricing,
  defaultRegionId,
  currency,
  fx,
  onClose,
  onSave,
}: ServiceDrawerProps) {
  const [kind, setKind] = useState<ServiceKind | null>(null);
  const [draft, setDraft] = useState<Resource | null>(null);
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    if (editing) {
      setKind(editing.kind);
      setDraft({ ...editing });
    } else if (initialKind) {
      setKind(initialKind);
      setDraft(createDefaultResource(initialKind, defaultRegionId));
    } else {
      setKind(null);
      setDraft(null);
    }
  }, [open, editing?.id, initialKind, defaultRegionId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const startCosts = useMemo(() => {
    const entries = SERVICE_ORDER.map((service) => [
      service,
      calculateResource(createDefaultResource(service, defaultRegionId), pricing),
    ]);
    return Object.fromEntries(entries) as Record<ServiceKind, number>;
  }, [pricing, defaultRegionId]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SERVICE_ORDER;
    return SERVICE_ORDER.filter((service) => {
      const meta = SERVICES[service];
      return `${meta.title} ${meta.eyebrow} ${meta.description} ${service}`
        .toLowerCase()
        .includes(needle);
    });
  }, [query]);

  if (!open) return null;

  const patch = (values: Record<string, unknown>) => {
    setDraft((current) => (current ? ({ ...current, ...values } as Resource) : current));
  };

  const changeRegion = (regionId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const region = getRegion(pricing, regionId);
      let next = { ...current, regionId } as Resource;
      if (next.kind === "ec2" && !region.ec2[next.instanceType]) {
        next = { ...next, instanceType: Object.keys(region.ec2)[0] };
      }
      if (next.kind === "rds" && !region.rds[next.engine].instance[next.instanceType]) {
        next = { ...next, instanceType: Object.keys(region.rds[next.engine].instance)[0] };
      }
      return next;
    });
  };

  const selectService = (service: ServiceKind) => {
    setKind(service);
    setDraft(createDefaultResource(service, defaultRegionId));
  };

  const goBack = () => {
    setKind(null);
    setDraft(null);
  };

  const estimate = draft ? calculateResource(draft, pricing) : 0;
  const isEditing = Boolean(editing);
  const meta = kind ? SERVICES[kind] : null;
  const ActiveIcon = meta?.icon ?? Plus;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="서비스 카탈로그">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-zinc-950/45 backdrop-blur-[2px] animate-fade-in"
      />

      <aside className="absolute top-0 right-0 flex h-full w-full max-w-[580px] animate-drawer-in flex-col border-l border-zinc-200 bg-[#fbfbfc] shadow-2xl dark:border-white/10 dark:bg-[#0d0d12]">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200/80 px-4 sm:px-5 dark:border-white/[0.07]">
          {kind && meta ? (
            <>
              <button
                type="button"
                onClick={goBack}
                aria-label="서비스 목록으로 돌아가기"
                className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft size={15} />
              </button>
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl ring-1", meta.tile)}>
                <ActiveIcon size={17} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                  {isEditing ? `${meta.title} 수정` : meta.title}
                </h2>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
                  {meta.eyebrow}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
                <Plus size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">서비스 카탈로그</h2>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
                  7 services · real rates
                </p>
              </div>
            </>
          )}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="서비스 추가 닫기"
            className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {kind && draft ? (
            <div className="space-y-6 px-4 py-5 sm:px-5">
              <RegionSelect regionId={draft.regionId} pricing={pricing} onChange={changeRegion} />

              {draft.kind === "ec2" && <Ec2Fields resource={draft} pricing={pricing} onPatch={patch} />}
              {draft.kind === "ebs" && <EbsFields resource={draft} pricing={pricing} onPatch={patch} />}
              {draft.kind === "rds" && <RdsFields resource={draft} pricing={pricing} onPatch={patch} />}
              {draft.kind === "s3" && <S3Fields resource={draft} pricing={pricing} onPatch={patch} />}
              {draft.kind === "nat" && <NatFields resource={draft} onPatch={patch} />}
              {draft.kind === "alb" && <AlbFields resource={draft} onPatch={patch} />}
              {draft.kind === "dataTransfer" && (
                <TransferFields resource={draft} pricing={pricing} onPatch={patch} />
              )}

              <div className="flex gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-zinc-500">
                <Info size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                <span>
                  요율은 AWS Pricing Calculator의 현재 미터 단가를 사용합니다. 세금, 크레딧, 약정 할인은
                  포함되지 않습니다.
                </span>
              </div>
            </div>
          ) : (
            <div className="px-4 py-5 sm:px-5">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="EC2, RDS, S3 검색…"
                  aria-label="서비스 검색"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-3 pl-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-zinc-600"
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
                  {query ? `검색 결과 ${filteredServices.length}개` : "서비스 선택"}
                </p>
                <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                  <MapPin size={10} />
                  {pricing.meta.regions.find((region) => region.id === defaultRegionId)?.label ?? defaultRegionId}
                </span>
              </div>

              {filteredServices.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-400 dark:border-white/10 dark:text-zinc-600">
                  검색과 일치하는 서비스가 없습니다.
                </div>
              ) : (
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {filteredServices.map((service) => {
                    const serviceMeta = SERVICES[service];
                    const Icon = serviceMeta.icon;
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => selectService(service)}
                        className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none dark:hover:border-indigo-400/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn("grid h-9 w-9 place-items-center rounded-xl ring-1", serviceMeta.tile)}>
                            <Icon size={16} strokeWidth={1.9} />
                          </span>
                          <ArrowRight
                            size={14}
                            className="mt-1 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-zinc-600"
                          />
                        </div>
                        <p className="mt-2.5 text-xs font-bold text-zinc-900 dark:text-white">
                          {serviceMeta.title.replace("Amazon ", "")}
                        </p>
                        <p className="text-[9px] font-bold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
                          {serviceMeta.eyebrow}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                          {serviceMeta.description}
                        </p>
                        <p className="mt-2.5 border-t border-zinc-100 pt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:border-white/[0.06] dark:text-zinc-600">
                          기본 구성 {formatMoney(startCosts[service], currency, fx)}/월
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-5 text-center text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
                모든 금액은 월 730시간 기준이며, 리전별 실제 미터 요율을 적용합니다.
              </p>
            </div>
          )}
        </div>

        {kind && draft && (
          <footer className="shrink-0 border-t border-zinc-200/80 bg-white/85 px-4 py-4 backdrop-blur sm:px-5 dark:border-white/[0.07] dark:bg-[#0d0d12]/90">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
                  월 예상 비용
                </p>
                <p className="mt-0.5 truncate font-mono text-xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                  {formatMoney(estimate, currency, fx)}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-600">
                  {isEditing ? "변경 사항을 저장하면 즉시 반영됩니다" : "추가 즉시 헤더 합계에 반영됩니다"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => draft && onSave(draft)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-[0_8px_24px_-10px_rgba(79,70,229,.9)] transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                {isEditing ? "변경 저장" : "리소스 추가"}
                <ArrowRight size={14} />
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------- Shared bits ------------------------------ */

function RegionSelect({
  regionId,
  pricing,
  onChange,
}: {
  regionId: string;
  pricing: PricingData;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <MapPin size={12} className="text-indigo-500" />
        <label className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">리전</label>
      </div>
      <div className="relative">
        <select
          aria-label="리소스 리전"
          value={regionId}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
        >
          {pricing.meta.regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.label} · {region.awsName}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </div>
  );
}

function SectionLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
        {children}
      </h3>
      {hint && <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{hint}</span>}
    </div>
  );
}

/* ---------------------------------- EC2 ---------------------------------- */

const FAMILY_ORDER = ["t4g", "t3", "m6i", "m6g", "m7g", "c6g", "c6i", "c7g", "r6g", "r6i", "r7g", "g4dn", "g5"];

function Ec2Fields({
  resource,
  pricing,
  onPatch,
}: {
  resource: Ec2Resource;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const families = Array.from(new Set(Object.keys(region.ec2).map((type) => type.split(".")[0]))).sort(
    (a, b) => {
      const ai = FAMILY_ORDER.indexOf(a);
      const bi = FAMILY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    },
  );
  const activeFamily = resource.instanceType.split(".")[0];
  const instances = Object.entries(region.ec2)
    .filter(([type]) => type.split(".")[0] === activeFamily)
    .sort((a, b) => a[1].vcpu - b[1].vcpu || a[1].mem - b[1].mem);
  const rate = region.ec2[resource.instanceType];

  return (
    <>
      <div>
        <SectionLabel hint="Graviton · Intel · AMD">인스턴스 패밀리</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {families.map((family) => (
            <Chip
              key={family}
              active={family === activeFamily}
              onClick={() => {
                const first = Object.entries(region.ec2)
                  .filter(([type]) => type.split(".")[0] === family)
                  .sort((a, b) => a[1].vcpu - b[1].vcpu || a[1].mem - b[1].mem)[0];
                if (first) onPatch({ instanceType: first[0] });
              }}
            >
              {family}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel hint="Linux · On-Demand">인스턴스 유형</SectionLabel>
        <div className="relative">
          <select
            aria-label="EC2 인스턴스 유형"
            value={resource.instanceType}
            onChange={(event) => onPatch({ instanceType: event.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {instances.map(([type, item]) => (
              <option key={type} value={type}>
                {type} · {item.vcpu} vCPU · {item.mem} GiB
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
          />
        </div>
        {rate && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              {formatUsd(rate.price, 4)}/hr
            </span>
            730시간 · {formatNumber(rate.vcpu)} vCPU · {formatNumber(rate.mem)} GiB
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">인스턴스 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">같은 사양으로 묶어서 계산합니다</p>
        </div>
        <Stepper value={resource.qty} min={1} max={999} onChange={(qty) => onPatch({ qty })} label="EC2 수량" />
      </div>

      <RangeField
        label="월평균 가동률"
        hint="스케줄링으로 유휴 시간이 있다면 낮춰보세요"
        value={resource.utilization}
        onChange={(utilization) => onPatch({ utilization })}
        min={1}
        max={100}
        unit="%"
      />
    </>
  );
}

/* ---------------------------------- EBS ---------------------------------- */

const EBS_TYPES: EbsResource["volumeType"][] = ["gp3", "gp2", "io1", "io2", "st1", "sc1"];

function EbsFields({
  resource,
  pricing,
  onPatch,
}: {
  resource: EbsResource;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const rate = region.ebs[resource.volumeType];
  const supportsIops = ["gp3", "io1", "io2"].includes(resource.volumeType);
  const iopsMax = resource.volumeType === "gp3" ? 16000 : 64000;
  const iopsMin = resource.volumeType === "gp3" ? 3000 : 100;

  return (
    <>
      <div>
        <SectionLabel hint="SSD · HDD">볼륨 유형</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {EBS_TYPES.map((type) => (
            <Chip
              key={type}
              active={resource.volumeType === type}
              onClick={() =>
                onPatch({
                  volumeType: type,
                  iops: type === "gp3" ? 3000 : type === "io1" || type === "io2" ? 3000 : resource.iops,
                  throughput: 125,
                })
              }
            >
              {type.toUpperCase()}
            </Chip>
          ))}
        </div>
        {rate && (
          <p className="mt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
            {formatUsd(rate.price, 4)} / GB-month
          </p>
        )}
      </div>

      <RangeField
        label="볼륨 크기"
        hint={`${resource.volumeType.toUpperCase()} · 최대 16 TiB`}
        value={resource.sizeGb}
        onChange={(sizeGb) => onPatch({ sizeGb })}
        min={1}
        max={16384}
        unit="GB"
      />

      {supportsIops && (
        <RangeField
          label="프로비저닝 IOPS"
          hint={
            resource.volumeType === "gp3"
              ? "3,000 IOPS까지 기본 포함"
              : "io1 · io2는 IOPS에 따라 추가 요금이 적용됩니다"
          }
          value={resource.iops}
          onChange={(iops) => onPatch({ iops })}
          min={iopsMin}
          max={iopsMax}
          step={100}
          unit="IOPS"
        />
      )}

      {resource.volumeType === "gp3" && (
        <RangeField
          label="처리량"
          hint="125 MB/s까지 기본 포함 · 초과분만 과금"
          value={resource.throughput}
          onChange={(throughput) => onPatch({ throughput })}
          min={125}
          max={2000}
          step={25}
          unit="MB/s"
        />
      )}

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">볼륨 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">동일 사양 볼륨을 묶어 계산</p>
        </div>
        <Stepper value={resource.qty} min={1} max={999} onChange={(qty) => onPatch({ qty })} label="EBS 수량" />
      </div>
    </>
  );
}

/* ---------------------------------- RDS ---------------------------------- */

const RDS_STORAGE_TYPES: RdsResource["storageType"][] = ["gp3", "gp2", "io1", "io2"];

function RdsFields({
  resource,
  pricing,
  onPatch,
}: {
  resource: RdsResource;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const engine = region.rds[resource.engine];
  const instances = Object.entries(engine.instance).sort(
    (a, b) => a[1].vcpu - b[1].vcpu || a[1].mem - b[1].mem,
  );
  const instance = engine.instance[resource.instanceType];
  const az = resource.multiAz ? "multi" : "single";
  const storageRate = engine.storage[resource.storageType][az];
  const supportsIops = resource.storageType === "io1" || resource.storageType === "io2";

  return (
    <>
      <div>
        <SectionLabel>엔진</SectionLabel>
        <Segmented
          ariaLabel="RDS 엔진"
          value={resource.engine}
          onChange={(next) => onPatch({ engine: next })}
          options={[
            { value: "postgres", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
          ]}
        />
      </div>

      <div>
        <SectionLabel hint={resource.multiAz ? "Multi-AZ 요율" : "Single-AZ 요율"}>DB 인스턴스 클래스</SectionLabel>
        <div className="relative">
          <select
            aria-label="RDS 인스턴스 클래스"
            value={resource.instanceType}
            onChange={(event) => onPatch({ instanceType: event.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {instances.map(([type, item]) => (
              <option key={type} value={type}>
                {type} · {item.vcpu} vCPU · {item.mem} GiB
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
          />
        </div>
        {instance && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              {formatUsd(resource.multiAz ? instance.multi : instance.single, 4)}/hr
            </span>
            {formatNumber(instance.vcpu)} vCPU · {formatNumber(instance.mem)} GiB ·{" "}
            {resource.multiAz ? "Multi-AZ" : "Single-AZ"}
          </p>
        )}
      </div>

      <Toggle
        checked={resource.multiAz}
        onChange={(multiAz) => onPatch({ multiAz })}
        label="Multi-AZ 배포"
        hint="가용 영역 이중화 · 인스턴스와 스토리지 요율이 약 2배"
      />

      <RangeField
        label="스토리지 크기"
        hint="자동 확장 여유분을 포함해 설정하세요"
        value={resource.storageGb}
        onChange={(storageGb) => onPatch({ storageGb })}
        min={20}
        max={16384}
        unit="GB"
      />

      <div>
        <SectionLabel hint={storageRate ? `${formatUsd(storageRate.price, 3)}/GB-mo` : undefined}>
          스토리지 유형
        </SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {RDS_STORAGE_TYPES.map((type) => (
            <Chip
              key={type}
              active={resource.storageType === type}
              onClick={() =>
                onPatch({
                  storageType: type,
                  iops: type === "io1" || type === "io2" ? Math.max(resource.iops, 1000) : resource.iops,
                })
              }
            >
              {type.toUpperCase()}
            </Chip>
          ))}
        </div>
      </div>

      {supportsIops && (
        <RangeField
          label="프로비저닝 IOPS"
          hint="io1 · io2 스토리지에서만 적용"
          value={resource.iops}
          onChange={(iops) => onPatch({ iops })}
          min={1000}
          max={64000}
          step={500}
          unit="IOPS"
        />
      )}

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">DB 인스턴스 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">스토리지는 인스턴스당 1개로 계산</p>
        </div>
        <Stepper value={resource.qty} min={1} max={99} onChange={(qty) => onPatch({ qty })} label="RDS 수량" />
      </div>
    </>
  );
}

/* ----------------------------------- S3 ---------------------------------- */

const S3_CLASSES: { value: S3Resource["storageClass"]; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "standardIA", label: "Standard-IA" },
  { value: "onezoneIA", label: "One Zone-IA" },
  { value: "glacierIR", label: "Glacier Instant" },
  { value: "glacierFlexible", label: "Glacier Flexible" },
  { value: "deepArchive", label: "Deep Archive" },
];

function S3Fields({
  resource,
  pricing,
  onPatch,
}: {
  resource: S3Resource;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const config = region.s3[resource.storageClass] as { storage?: { price: number } | null };
  const storageRate =
    resource.storageClass === "standard" ? region.s3.standard.tiers[0] : config.storage;
  const hasRetrieval = resource.storageClass !== "standard";

  return (
    <>
      <div>
        <SectionLabel hint="수명 주기 전환">스토리지 클래스</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {S3_CLASSES.map((item) => (
            <Chip
              key={item.value}
              active={resource.storageClass === item.value}
              onClick={() => onPatch({ storageClass: item.value })}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        {storageRate && (
          <p className="mt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
            {formatUsd(storageRate.price, 4)} / GB-month
            {resource.storageClass === "standard" && " · 첫 50TB 기준"}
          </p>
        )}
      </div>

      <RangeField
        label="저장 데이터"
        hint="Standard는 50TB · 500TB 구간 요율이 자동 적용됩니다"
        value={resource.storageGb}
        onChange={(storageGb) => onPatch({ storageGb })}
        min={0}
        max={102400}
        step={10}
        unit="GB"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="PUT 요청"
          hint="월간"
          value={resource.putRequests}
          onChange={(putRequests) => onPatch({ putRequests })}
          min={0}
          max={1_000_000_000}
          step={1000}
          unit="/월"
        />
        <NumberField
          label="GET 요청"
          hint="월간"
          value={resource.getRequests}
          onChange={(getRequests) => onPatch({ getRequests })}
          min={0}
          max={10_000_000_000}
          step={1000}
          unit="/월"
        />
      </div>

      {hasRetrieval && (
        <RangeField
          label="월 데이터 검색량"
          hint="Standard-IA · Glacier 계열은 검색 GB당 요금이 추가됩니다"
          value={resource.retrievalGb}
          onChange={(retrievalGb) => onPatch({ retrievalGb })}
          min={0}
          max={102400}
          step={10}
          unit="GB"
        />
      )}
    </>
  );
}

/* ---------------------------------- NAT ---------------------------------- */

function NatFields({
  resource,
  onPatch,
}: {
  resource: Extract<Resource, { kind: "nat" }>;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">NAT Gateway 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">가용 영역별 1개 구성을 권장</p>
        </div>
        <Stepper value={resource.qty} min={1} max={99} onChange={(qty) => onPatch({ qty })} label="NAT 수량" />
      </div>

      <RangeField
        label="운영 시간"
        hint="월 최대 744시간"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label="처리 데이터"
        hint="NAT Gateway를 통과한 월간 트래픽"
        value={resource.dataGb}
        onChange={(dataGb) => onPatch({ dataGb })}
        min={0}
        max={102400}
        step={10}
        unit="GB"
      />
    </>
  );
}

/* ---------------------------------- ALB ---------------------------------- */

function AlbFields({
  resource,
  onPatch,
}: {
  resource: Extract<Resource, { kind: "alb" }>;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">로드 밸런서 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">ALB는 시간당 요금이 동일하게 적용됩니다</p>
        </div>
        <Stepper value={resource.qty} min={1} max={99} onChange={(qty) => onPatch({ qty })} label="ALB 수량" />
      </div>

      <RangeField
        label="운영 시간"
        hint="월 최대 744시간"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label="평균 LCU"
        hint="시간당 평균 Load Balancer Capacity Unit"
        value={resource.lcu}
        onChange={(lcu) => onPatch({ lcu })}
        min={0}
        max={100}
        step={0.5}
        unit="LCU"
        format={(value) => formatNumber(value, 1)}
      />
    </>
  );
}

/* ------------------------------ Data Transfer ----------------------------- */

function TransferFields({
  resource,
  pricing,
  onPatch,
}: {
  resource: Extract<Resource, { kind: "dataTransfer" }>;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const tiers = region.dataTransfer ?? [];

  return (
    <>
      <RangeField
        label="월 인터넷 아웃바운드"
        hint={`${(resource.gbOut / 1024).toFixed(2)} TB · 10TB / 50TB / 150TB 구간 자동 적용`}
        value={resource.gbOut}
        onChange={(gbOut) => onPatch({ gbOut })}
        min={0}
        max={102400}
        step={100}
        unit="GB"
      />

      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 dark:border-white/[0.07] dark:bg-white/[0.03]">
        <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
          {region.label} 구간 요율
        </p>
        <div className="mt-2 space-y-1.5 font-mono text-[10px] text-zinc-500 tabular-nums dark:text-zinc-500">
          {tiers.map((tier, index) => {
            const previous = tiers[index - 1]?.upToTb ?? 0;
            const label =
              tier.upToTb === null
                ? `${previous} TB 초과`
                : index === 0
                  ? `처음 ${tier.upToTb} TB`
                  : `${previous}–${tier.upToTb} TB`;
            return (
              <div key={`${tier.upToTb}-${tier.price}`} className="flex justify-between">
                <span>{label}</span>
                <span>{formatUsd(tier.price, 3)} / GB</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
          인바운드 전송은 무료입니다. 아웃바운드 사용량에만 구간 요율이 순차 적용됩니다.
        </p>
      </div>
    </>
  );
}
