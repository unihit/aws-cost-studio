import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Info,
  MapPin,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";
import type {
  BedrockInferenceMode,
  BedrockResource,
  Category,
  CloudFrontResource,
  Currency,
  DynamoDbResource,
  EbsResource,
  Ec2Resource,
  EksResource,
  ElastiCacheResource,
  EcsResource,
  EnvTag,
  LambdaResource,
  PricingData,
  PurchaseOption,
  RdsResource,
  Resource,
  S3Resource,
  ServiceKind,
  TgwResource,
  VpnResource,
} from "../types";
import {
  calculateFargateTaskHourly,
  calculateResource,
  ELASTICACHE_NODES,
  getBedrockUnitRates,
  getElastiCacheHourlyRate,
  getRegion,
  getRegionalFactor,
  getTgwAttachmentHourly,
  rdsGp3FreeBaseline,
} from "../lib/calc";
import { formatMoney, formatNumber, formatUsd } from "../lib/format";
import { createDefaultResource, fallbackInstanceType } from "../lib/resources";
import {
  BEDROCK_MODELS,
  DEFAULT_BEDROCK_MODEL_ID,
  ENV_META,
  SERVICE_ORDER,
  SERVICES,
} from "../lib/services";
import { Chip, NumberField, RangeField, Segmented, Stepper, Toggle, cn } from "./Primitives";

interface ServiceDrawerProps {
  open: boolean;
  initialKind: ServiceKind | null;
  editing: Resource | null;
  pricing: PricingData;
  defaultRegionId: string;
  purchaseOption: PurchaseOption;
  currency: Currency;
  fx: number;
  onClose: () => void;
  onSave: (resource: Resource) => void;
}

const CATALOG_CATEGORIES: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "compute", label: "Compute" },
  { value: "database", label: "Database" },
  { value: "storage", label: "Storage" },
  { value: "network", label: "Network" },
];

export function ServiceDrawer({
  open,
  initialKind,
  editing,
  pricing,
  defaultRegionId,
  purchaseOption,
  currency,
  fx,
  onClose,
  onSave,
}: ServiceDrawerProps) {
  const [kind, setKind] = useState<ServiceKind | null>(null);
  const [draft, setDraft] = useState<Resource | null>(null);
  const [query, setQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<"all" | Category>("all");
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCatalogCategory("all");
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
    const focusTimer = window.setTimeout(() => {
      if (!editing && !initialKind) {
        searchRef.current?.focus();
      } else {
        closeRef.current?.focus();
      }
    }, 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, editing, initialKind, onClose]);

  const startCosts = useMemo(() => {
    const entries = SERVICE_ORDER.map((service) => [
      service,
      calculateResource(createDefaultResource(service, defaultRegionId), pricing, purchaseOption),
    ]);
    return Object.fromEntries(entries) as Record<ServiceKind, number>;
  }, [pricing, defaultRegionId, purchaseOption]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SERVICE_ORDER.filter((service) => {
      const meta = SERVICES[service];
      if (catalogCategory !== "all" && meta.category !== catalogCategory) return false;
      if (!needle) return true;
      return `${meta.title} ${meta.eyebrow} ${meta.description} ${service}`
        .toLowerCase()
        .includes(needle);
    });
  }, [query, catalogCategory]);

  if (!open) return null;

  const patch = (values: Record<string, unknown>) => {
    setDraft((current) => (current ? ({ ...current, ...values } as Resource) : current));
  };

  const changeRegion = (regionId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const region = getRegion(pricing, regionId);
      let next = { ...current, regionId } as Resource;
      if (next.kind === "ec2") {
        next = {
          ...next,
          instanceType: fallbackInstanceType(region.ec2, next.instanceType, "t4g.medium"),
        };
      } else if (next.kind === "rds") {
        next = {
          ...next,
          instanceType: fallbackInstanceType(
            region.rds[next.engine].instance,
            next.instanceType,
            "db.t4g.micro",
          ),
        };
      } else if (next.kind === "eks") {
        next = {
          ...next,
          workerInstanceType: fallbackInstanceType(
            region.ec2,
            next.workerInstanceType,
            "m6g.large",
          ),
        };
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
    setCatalogCategory("all");
    window.setTimeout(() => searchRef.current?.focus(), 20);
  };

  const estimate = draft ? calculateResource(draft, pricing, purchaseOption) : 0;
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
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                  서비스 카탈로그
                </h2>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-600">
                  16 services · real rates
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
              <MetaFields
                label={draft.label ?? ""}
                env={draft.env}
                placeholder={`예: ${meta?.title.replace("Amazon ", "")} (웹/API·결제 DB 등)`}
                onPatch={patch}
              />

              <RegionSelect regionId={draft.regionId} pricing={pricing} onChange={changeRegion} />

              {draft.kind === "ec2" && (
                <Ec2Fields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "ecs" && (
                <EcsFields resource={draft} purchaseOption={purchaseOption} onPatch={patch} />
              )}
              {draft.kind === "ebs" && (
                <EbsFields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "rds" && (
                <RdsFields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "dynamodb" && (
                <DynamoDbFields resource={draft} onPatch={patch} />
              )}
              {draft.kind === "elasticache" && (
                <ElastiCacheFields resource={draft} onPatch={patch} />
              )}
              {draft.kind === "s3" && (
                <S3Fields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "lambda" && <LambdaFields resource={draft} onPatch={patch} />}
              {draft.kind === "eks" && (
                <EksFields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "cloudfront" && <CloudFrontFields resource={draft} onPatch={patch} />}
              {draft.kind === "nat" && <NatFields resource={draft} onPatch={patch} />}
              {draft.kind === "alb" && (
                <AlbFields resource={draft} pricing={pricing} onPatch={patch} />
              )}
              {draft.kind === "tgw" && <TgwFields resource={draft} onPatch={patch} />}
              {draft.kind === "vpn" && <VpnFields resource={draft} onPatch={patch} />}
              {draft.kind === "bedrock" && <BedrockFields resource={draft} onPatch={patch} />}
              {draft.kind === "dataTransfer" && (
                <TransferFields resource={draft} pricing={pricing} onPatch={patch} />
              )}

              <div className="flex gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-zinc-500">
                <Info size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                <span>
                  요율은 AWS Pricing Calculator의 미터 단가를 사용하며, 메인 화면에서 선택한 약정 할인
                  모드({purchaseOption === "onDemand" ? "On-Demand" : purchaseOption === "sp1yr" ? "1년 SP/RI" : "3년 SP/RI"})가 실시간 반영됩니다.
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
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="EC2, ECS, Bedrock, RDS, DynamoDB, TGW, VPN 검색…"
                  aria-label="서비스 검색"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-9 pl-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-zinc-600"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="검색어 지우기"
                    className="absolute top-1/2 right-2.5 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {CATALOG_CATEGORIES.map((item) => (
                  <Chip
                    key={item.value}
                    active={catalogCategory === item.value}
                    onClick={() => setCatalogCategory(item.value)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
                  {query || catalogCategory !== "all"
                    ? `검색 결과 ${filteredServices.length}개`
                    : `서비스 선택 (${SERVICE_ORDER.length}종)`}
                </p>
                <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                  <MapPin size={10} />
                  {pricing.meta.regions.find((region) => region.id === defaultRegionId)?.label ??
                    defaultRegionId}
                </span>
              </div>

              {filteredServices.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-400 dark:border-white/10 dark:text-zinc-600">
                  <p>검색과 일치하는 서비스가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCatalogCategory("all");
                      searchRef.current?.focus();
                    }}
                    className="mt-2 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    검색 · 카테고리 필터 초기화
                  </button>
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
                          <span
                            className={cn(
                              "grid h-9 w-9 place-items-center rounded-xl ring-1",
                              serviceMeta.tile,
                            )}
                          >
                            <Icon size={16} strokeWidth={1.9} />
                          </span>
                          <ArrowRight
                            size={14}
                            className="mt-1 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-zinc-600"
                          />
                        </div>
                        <p className="mt-2.5 text-xs font-bold text-zinc-900 dark:text-white">
                          {serviceMeta.title.replace("Amazon ", "").replace("AWS ", "")}
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

function MetaFields({
  label,
  env,
  placeholder,
  onPatch,
}: {
  label: string;
  env?: EnvTag;
  placeholder: string;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const envs: (EnvTag | undefined)[] = [undefined, "prod", "stage", "dev"];
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">
          <Tag size={12} className="text-indigo-500" />
          리소스 별칭 & 환경 태그 (선택)
        </span>
        <div className="flex items-center gap-1">
          {envs.map((item) => {
            const active = env === item;
            const text = item ? ENV_META[item].label : "태그 없음";
            return (
              <button
                key={text}
                type="button"
                onClick={() => onPatch({ env: item })}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-bold transition",
                  active
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400",
                )}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
      <input
        type="text"
        value={label}
        maxLength={40}
        onChange={(e) => onPatch({ label: e.target.value || undefined })}
        placeholder={placeholder}
        aria-label="리소스 별칭"
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:bg-white dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-zinc-600"
      />
    </div>
  );
}

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

const FAMILY_ORDER = [
  "t8i",
  "t4g",
  "t3",
  "m8g",
  "m7g",
  "m6g",
  "m7i",
  "m6i",
  "c8g",
  "c7g",
  "c6g",
  "c7i",
  "c6i",
  "r8g",
  "r7g",
  "r6g",
  "r7i",
  "r6i",
  "g4dn",
  "g5",
];

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
  const families = Array.from(
    new Set(Object.keys(region.ec2).map((type) => type.split(".")[0])),
  ).sort((a, b) => {
    const ai = FAMILY_ORDER.indexOf(a);
    const bi = FAMILY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
  const activeFamily = resource.instanceType.split(".")[0];
  const instances = Object.entries(region.ec2)
    .filter(([type]) => type.split(".")[0] === activeFamily)
    .sort((a, b) => a[1].vcpu - b[1].vcpu || a[1].mem - b[1].mem);
  const rate = region.ec2[resource.instanceType];

  return (
    <>
      <div>
        <SectionLabel hint="Graviton · Intel · GPU">인스턴스 패밀리</SectionLabel>
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
        <SectionLabel hint="Linux · 기본 단가">인스턴스 유형</SectionLabel>
        <div className="relative">
          <select
            aria-label="EC2 인스턴스 유형"
            value={resource.instanceType}
            onChange={(event) => onPatch({ instanceType: event.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {instances.map(([type, item]) => (
              <option key={type} value={type}>
                {type} · {item.vcpu} vCPU · {item.mem} GiB ({formatUsd(item.price, 4)}/hr)
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
        <Stepper
          value={resource.qty}
          min={1}
          max={999}
          onChange={(qty) => onPatch({ qty })}
          label="EC2 수량"
        />
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
                  iops:
                    type === "gp3"
                      ? 3000
                      : type === "io1" || type === "io2"
                        ? 3000
                        : resource.iops,
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
        <Stepper
          value={resource.qty}
          min={1}
          max={999}
          onChange={(qty) => onPatch({ qty })}
          label="EBS 수량"
        />
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
  const supportsIops =
    resource.storageType === "gp3" ||
    resource.storageType === "io1" ||
    resource.storageType === "io2";
  const { freeIops, freeThroughput } = rdsGp3FreeBaseline(resource.storageGb);
  const isServerlessV2 = resource.deploymentMode === "serverlessV2";
  const acuRate = 0.12 * getRegionalFactor(resource.regionId);

  return (
    <>
      <div>
        <SectionLabel hint="프로비저닝 인스턴스 vs 오토스케일링 ACU">배포 방식 (Deployment Mode)</SectionLabel>
        <Segmented
          ariaLabel="RDS 배포 방식"
          value={resource.deploymentMode ?? "instance"}
          onChange={(deploymentMode) => onPatch({ deploymentMode })}
          options={[
            { value: "instance", label: "RDS 인스턴스 (db.*)" },
            { value: "serverlessV2", label: "Aurora Serverless v2 (ACU)" },
          ]}
        />
      </div>

      <div>
        <SectionLabel>엔진</SectionLabel>
        <Segmented
          ariaLabel="RDS 엔진"
          value={resource.engine}
          onChange={(next) =>
            onPatch({
              engine: next,
              instanceType: fallbackInstanceType(
                region.rds[next].instance,
                resource.instanceType,
                "db.t4g.micro",
              ),
            })
          }
          options={[
            { value: "postgres", label: isServerlessV2 ? "Aurora PostgreSQL" : "PostgreSQL" },
            { value: "mysql", label: isServerlessV2 ? "Aurora MySQL" : "MySQL" },
          ]}
        />
      </div>

      {isServerlessV2 ? (
        <RangeField
          label="월평균 ACU (Aurora Capacity Unit)"
          hint={`1 ACU ≈ 2 GiB 메모리 · 시간당 ${formatUsd(acuRate, 4)}/ACU-hr (0.5 ~ 128 ACU 자동 스케일링)`}
          value={resource.acu ?? 2}
          onChange={(acu) => onPatch({ acu })}
          min={0.5}
          max={64}
          step={0.5}
          unit="ACU"
          format={(v) => formatNumber(v, 1)}
        />
      ) : (
        <div>
          <SectionLabel hint={resource.multiAz ? "Multi-AZ 요율" : "Single-AZ 요율"}>
            DB 인스턴스 클래스
          </SectionLabel>
          <div className="relative">
            <select
              aria-label="RDS 인스턴스 클래스"
              value={resource.instanceType}
              onChange={(event) => onPatch({ instanceType: event.target.value })}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
            >
              {instances.map(([type, item]) => (
                <option key={type} value={type}>
                  {type} · {item.vcpu} vCPU · {item.mem} GiB ({formatUsd(resource.multiAz ? item.multi : item.single, 4)}/hr)
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
      )}

      <Toggle
        checked={resource.multiAz}
        onChange={(multiAz) => onPatch({ multiAz })}
        label="Multi-AZ 배포 (고가용성)"
        hint={
          isServerlessV2
            ? "리더(Reader) Serverless v2 인스턴스 추가 구성 (ACU 컴퓨트 2배)"
            : "가용 영역 이중화 · 인스턴스와 스토리지 요율이 약 2배"
        }
      />

      <RangeField
        label="스토리지 크기"
        hint={
          isServerlessV2
            ? "Aurora 클러스터 공유 스토리지 (GB당 약 $0.10~$0.12/월)"
            : "gp3는 400GB 이상부터 기본 12,000 IOPS / 500 MB/s가 무료 제공됩니다"
        }
        value={resource.storageGb}
        onChange={(storageGb) => {
          const baseline = rdsGp3FreeBaseline(storageGb);
          onPatch({
            storageGb,
            ...(resource.storageType === "gp3"
              ? {
                  iops: Math.max(resource.iops, baseline.freeIops),
                  throughput: Math.max(resource.throughput ?? baseline.freeThroughput, baseline.freeThroughput),
                }
              : {}),
          });
        }}
        min={20}
        max={16384}
        unit="GB"
      />

      {!isServerlessV2 && (
        <>
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
                      iops:
                        type === "gp3"
                          ? freeIops
                          : type === "io1" || type === "io2"
                            ? Math.max(resource.iops, 1000)
                            : resource.iops,
                      throughput: type === "gp3" ? freeThroughput : 125,
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
              hint={
                resource.storageType === "gp3"
                  ? `기본 ${formatNumber(freeIops)} IOPS 무료 · 초과분 과금`
                  : "io1 · io2 스토리지 프로비저닝 IOPS"
              }
              value={resource.iops}
              onChange={(iops) => onPatch({ iops })}
              min={resource.storageType === "gp3" ? freeIops : 1000}
              max={64000}
              step={500}
              unit="IOPS"
            />
          )}

          {resource.storageType === "gp3" && (
            <RangeField
              label="프로비저닝 처리량 (Throughput)"
              hint={`기본 ${freeThroughput} MB/s 무료 · 초과분 과금`}
              value={resource.throughput ?? freeThroughput}
              onChange={(throughput) => onPatch({ throughput })}
              min={freeThroughput}
              max={4000}
              step={25}
              unit="MB/s"
            />
          )}
        </>
      )}

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            {isServerlessV2 ? "Aurora 클러스터 수량" : "DB 인스턴스 수량"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">스토리지는 클러스터/인스턴스당 1개로 계산</p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={99}
          onChange={(qty) => onPatch({ qty })}
          label="RDS 수량"
        />
      </div>
    </>
  );
}

/* ------------------------------- DynamoDB -------------------------------- */

function DynamoDbFields({
  resource,
  onPatch,
}: {
  resource: DynamoDbResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const isOnDemand = resource.capacityMode === "onDemand";

  return (
    <>
      <div>
        <SectionLabel hint="On-Demand 요율 50% 인하 반영됨">용량 모드 (Capacity Mode)</SectionLabel>
        <Segmented
          ariaLabel="DynamoDB 용량 모드"
          value={resource.capacityMode}
          onChange={(capacityMode) => onPatch({ capacityMode })}
          options={[
            { value: "onDemand", label: "On-Demand (요청당 과금 · 50%↓)" },
            { value: "provisioned", label: "Provisioned (WCU / RCU)" },
          ]}
        />
      </div>

      <RangeField
        label="테이블 스토리지 용량"
        hint="프리 티어 적용 시 첫 25 GB 무료 · 초과분 약 $0.25~$0.285/GB-mo"
        value={resource.storageGb}
        onChange={(storageGb) => onPatch({ storageGb })}
        min={1}
        max={5000}
        step={5}
        unit="GB"
      />

      {isOnDemand ? (
        <>
          <RangeField
            label="월간 쓰기 요청 (Write Request Units)"
            hint="백만(Million) 건 단위 · 100만 건당 약 $0.625~$0.725"
            value={resource.writeUnits}
            onChange={(writeUnits) => onPatch({ writeUnits })}
            min={0}
            max={500}
            step={1}
            unit="M WRU"
          />
          <RangeField
            label="월간 읽기 요청 (Read Request Units)"
            hint="백만(Million) 건 단위 · 100만 건당 약 $0.125~$0.145"
            value={resource.readUnits}
            onChange={(readUnits) => onPatch({ readUnits })}
            min={0}
            max={2000}
            step={5}
            unit="M RRU"
          />
        </>
      ) : (
        <>
          <RangeField
            label="프로비저닝 쓰기 용량 (WCU)"
            hint="프리 티어 적용 시 25 WCU 무료"
            value={resource.writeUnits}
            onChange={(writeUnits) => onPatch({ writeUnits })}
            min={1}
            max={5000}
            step={5}
            unit="WCU"
          />
          <RangeField
            label="프로비저닝 읽기 용량 (RCU)"
            hint="프리 티어 적용 시 25 RCU 무료"
            value={resource.readUnits}
            onChange={(readUnits) => onPatch({ readUnits })}
            min={1}
            max={10000}
            step={10}
            unit="RCU"
          />
        </>
      )}

      <Toggle
        checked={resource.includeFreeTier}
        onChange={(includeFreeTier) => onPatch({ includeFreeTier })}
        label="AWS 상시 무료 티어 (Free Tier) 공제"
        hint="스토리지 25 GB 및 프로비저닝 25 WCU / 25 RCU 상시 무료 공제"
      />
    </>
  );
}

/* ------------------------------ ElastiCache ------------------------------ */

function ElastiCacheFields({
  resource,
  onPatch,
}: {
  resource: ElastiCacheResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const hourly = getElastiCacheHourlyRate(resource.regionId, resource.nodeType, resource.engine);
  const nodeEntries = Object.entries(ELASTICACHE_NODES);

  return (
    <>
      <div>
        <SectionLabel hint="Valkey는 Redis 대비 20% 저렴">인메모리 엔진</SectionLabel>
        <Segmented
          ariaLabel="ElastiCache 엔진"
          value={resource.engine}
          onChange={(engine) => onPatch({ engine })}
          options={[
            { value: "valkey", label: "Valkey (20% 할인 권장)" },
            { value: "redis", label: "Redis OSS" },
          ]}
        />
      </div>

      <div>
        <SectionLabel hint="Graviton2 · Graviton3">캐시 노드 유형</SectionLabel>
        <div className="relative">
          <select
            aria-label="ElastiCache 노드 유형"
            value={resource.nodeType}
            onChange={(e) => onPatch({ nodeType: e.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {nodeEntries.map(([nodeType, spec]) => (
              <option key={nodeType} value={nodeType}>
                {nodeType} · {spec.vcpu} vCPU · {spec.mem} GiB ({spec.family})
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
          노드당 {formatUsd(hourly, 4)}/hr · 총 {resource.qty * (1 + resource.replicas)}개 노드 가동
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">프라이머리 샤드 수</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">클러스터 파티션(샤드) 수량</p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={99}
          onChange={(qty) => onPatch({ qty })}
          label="샤드 수량"
        />
      </div>

      <RangeField
        label="샤드당 복제본(Replica) 수"
        hint="고가용성(Multi-AZ)을 위해 최소 1개 복제본을 권장합니다"
        value={resource.replicas}
        onChange={(replicas) => onPatch({ replicas })}
        min={0}
        max={5}
        step={1}
        unit="개"
      />

      <RangeField
        label="스냅샷 백업 스토리지"
        hint="추가 백업 스토리지 ($0.085 / GB-월)"
        value={resource.backupGb}
        onChange={(backupGb) => onPatch({ backupGb })}
        min={0}
        max={2000}
        step={10}
        unit="GB"
      />
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
  const putRate1k = ((region.s3.standard.put?.price ?? 0.0000045) * 1000).toFixed(4);
  const getRate10k = ((region.s3.standard.get?.price ?? 0.00000035) * 10000).toFixed(4);

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
          label="월간 PUT / POST 요청"
          hint={`1,000건당 약 $${putRate1k}`}
          value={resource.putRequests}
          onChange={(putRequests) => onPatch({ putRequests })}
          min={0}
          max={1_000_000_000}
          step={1000}
          unit="건"
        />
        <NumberField
          label="월간 GET / SELECT 요청"
          hint={`1만 건당 약 $${getRate10k}`}
          value={resource.getRequests}
          onChange={(getRequests) => onPatch({ getRequests })}
          min={0}
          max={10_000_000_000}
          step={1000}
          unit="건"
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

/* --------------------------------- Lambda -------------------------------- */

function LambdaFields({
  resource,
  onPatch,
}: {
  resource: LambdaResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div>
        <SectionLabel hint="Arm64는 GB-초당 20% 저렴">아키텍처</SectionLabel>
        <Segmented
          ariaLabel="Lambda 아키텍처"
          value={resource.arch}
          onChange={(arch) => onPatch({ arch })}
          options={[
            { value: "arm64", label: "Arm64 (Graviton2 · 20%↓)" },
            { value: "x86", label: "x86_64" },
          ]}
        />
      </div>

      <RangeField
        label="할당 메모리"
        hint="128 MB ~ 10,240 MB (메모리에 비례해 vCPU 성능 증가)"
        value={resource.memoryMb}
        onChange={(memoryMb) => onPatch({ memoryMb })}
        min={128}
        max={10240}
        step={64}
        unit="MB"
      />

      <RangeField
        label="평균 실행 시간"
        hint="호출 1회당 평균 소요 밀리초(ms)"
        value={resource.durationMs}
        onChange={(durationMs) => onPatch({ durationMs })}
        min={1}
        max={30000}
        step={10}
        unit="ms"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="월간 Lambda 호출 수"
          hint="100만 건당 $0.20"
          value={resource.invocations}
          onChange={(invocations) => onPatch({ invocations })}
          min={0}
          max={10_000_000_000}
          step={100_000}
          unit="건"
        />
        <NumberField
          label="HTTP API Gateway 요청"
          hint="외부 트리거 사용 시"
          value={resource.apiGatewayRequests}
          onChange={(apiGatewayRequests) => onPatch({ apiGatewayRequests })}
          min={0}
          max={10_000_000_000}
          step={100_000}
          unit="건"
        />
      </div>

      <Toggle
        checked={resource.includeFreeTier}
        onChange={(includeFreeTier) => onPatch({ includeFreeTier })}
        label="AWS 상시 프리티어 공제 적용"
        hint="매월 100만 건 요청 및 400,000 GB-초 컴퓨트 무료 공제"
      />
    </>
  );
}

/* ---------------------------------- EKS ---------------------------------- */

function EksFields({
  resource,
  pricing,
  onPatch,
}: {
  resource: EksResource;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const instances = Object.entries(region.ec2).sort(
    (a, b) => a[1].vcpu - b[1].vcpu || a[1].mem - b[1].mem,
  );

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">EKS 클러스터 수</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            클러스터당 컨트롤 플레인 기본 $0.10/hr (월 $73)
          </p>
        </div>
        <Stepper
          value={resource.clusters}
          min={1}
          max={50}
          onChange={(clusters) => onPatch({ clusters })}
          label="EKS 클러스터 수"
        />
      </div>

      <Toggle
        checked={resource.extendedSupport}
        onChange={(extendedSupport) => onPatch({ extendedSupport })}
        label="Kubernetes 확장 버전 지원 (Extended Support)"
        hint="표준 지원 종료 버전 유지 시 클러스터당 시간당 $0.60 부과"
      />

      <div>
        <SectionLabel hint="Managed Node Group">워커 노드 인스턴스 유형</SectionLabel>
        <div className="relative">
          <select
            aria-label="EKS 워커 노드 유형"
            value={resource.workerInstanceType}
            onChange={(e) => onPatch({ workerInstanceType: e.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {instances.map(([type, item]) => (
              <option key={type} value={type}>
                {type} · {item.vcpu} vCPU · {item.mem} GiB ({formatUsd(item.price, 4)}/hr)
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
          />
        </div>
      </div>

      <RangeField
        label="워커 노드 총 수량"
        hint="자체 관리형 또는 EKS 관리형 EC2 노드 수량"
        value={resource.workerQty}
        onChange={(workerQty) => onPatch({ workerQty })}
        min={0}
        max={200}
        step={1}
        unit="대"
      />
    </>
  );
}

/* ---------------------------------- ECS ---------------------------------- */

const ECS_VCPU_OPTIONS = [0.25, 0.5, 1, 2, 4, 8, 16];

const ECS_MEM_OPTIONS: Record<number, number[]> = {
  0.25: [0.5, 1, 2],
  0.5: [1, 2, 3, 4],
  1: [2, 3, 4, 5, 6, 7, 8],
  2: [4, 6, 8, 10, 12, 14, 16],
  4: [8, 12, 16, 20, 24, 28, 30],
  8: [16, 24, 32, 40, 48, 56, 60],
  16: [32, 48, 64, 80, 96, 112, 120],
};

function EcsFields({
  resource,
  purchaseOption,
  onPatch,
}: {
  resource: EcsResource;
  purchaseOption: PurchaseOption;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const taskHourly = calculateFargateTaskHourly(
    resource.regionId,
    resource.arch,
    resource.vcpu,
    resource.memoryGb,
    resource.launchType,
    purchaseOption,
  );

  const availableMems = ECS_MEM_OPTIONS[resource.vcpu] ?? [resource.memoryGb];

  return (
    <>
      <div>
        <SectionLabel hint="Fargate Spot은 최대 70% 할인">실행 모델 (Launch Type)</SectionLabel>
        <Segmented
          ariaLabel="ECS Fargate 모델"
          value={resource.launchType}
          onChange={(launchType) => onPatch({ launchType })}
          options={[
            { value: "fargate", label: "Fargate (기본)" },
            { value: "fargateSpot", label: "Fargate Spot (최대 70%↓)" },
          ]}
        />
      </div>

      <div>
        <SectionLabel hint="Arm64는 vCPU·메모리 20% 저렴">아키텍처</SectionLabel>
        <Segmented
          ariaLabel="Fargate 아키텍처"
          value={resource.arch}
          onChange={(arch) => onPatch({ arch })}
          options={[
            { value: "arm64", label: "Arm64 (Graviton · 20%↓)" },
            { value: "x86", label: "x86_64" },
          ]}
        />
      </div>

      <div>
        <SectionLabel hint="태스크당 할당">vCPU</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {ECS_VCPU_OPTIONS.map((v) => (
            <Chip
              key={v}
              active={resource.vcpu === v}
              onClick={() => {
                const mems = ECS_MEM_OPTIONS[v] ?? [1];
                const nextMem = mems.includes(resource.memoryGb) ? resource.memoryGb : mems[0];
                onPatch({ vcpu: v, memoryGb: nextMem });
              }}
            >
              {v} vCPU
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel hint={`선택한 ${resource.vcpu} vCPU 기준 지원 규격`}>메모리 (Memory)</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {availableMems.map((m) => (
            <Chip
              key={m}
              active={resource.memoryGb === m}
              onClick={() => onPatch({ memoryGb: m })}
            >
              {m} GiB
            </Chip>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
          태스크당 약 {formatUsd(taskHourly, 4)}/hr ·{" "}
          {resource.launchType === "fargateSpot" ? "Spot 70% 할인 반영됨" : "온디맨드/약정 반영됨"}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">태스크(Task) 수량</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">동시에 실행되는 Fargate 컨테이너 개수</p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={999}
          onChange={(qty) => onPatch({ qty })}
          label="ECS 태스크 수량"
        />
      </div>

      <RangeField
        label="월간 가동 시간"
        hint="AWS 표준 연평균 730h · 31일 기준 최대 744h"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label="임시 스토리지 (Ephemeral Storage)"
        hint="기본 20 GB 무료 포함 · 초과분만 $0.08/GB-mo 과금"
        value={resource.ephemeralStorageGb}
        onChange={(ephemeralStorageGb) => onPatch({ ephemeralStorageGb })}
        min={20}
        max={200}
        step={5}
        unit="GB"
      />
    </>
  );
}

/* ------------------------------- CloudFront ------------------------------ */

function CloudFrontFields({
  resource,
  onPatch,
}: {
  resource: CloudFrontResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  return (
    <>
      <RangeField
        label="월 엣지 데이터 전송량 (Data Transfer Out)"
        hint="매월 첫 1 TB (1,024 GB)는 상시 무료 티어로 자동 공제됩니다"
        value={resource.gbOut}
        onChange={(gbOut) => onPatch({ gbOut })}
        min={0}
        max={102400}
        step={100}
        unit="GB"
      />

      <NumberField
        label="월간 HTTPS 요청 수"
        hint="매월 첫 1,000만 건 무료 · 초과 시 1만 건당 약 $0.010~$0.012"
        value={resource.httpsRequests}
        onChange={(httpsRequests) => onPatch({ httpsRequests })}
        min={0}
        max={10_000_000_000}
        step={1_000_000}
        unit="건"
      />
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
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            NAT Gateway 수량
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            가용 영역별 1개 구성을 권장
          </p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={99}
          onChange={(qty) => onPatch({ qty })}
          label="NAT 수량"
        />
      </div>

      <RangeField
        label="월간 가동 시간"
        hint="AWS 표준 연평균 730h · 31일 기준 최대 744h"
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

/* ---------------------------------- ELB (ALB / NLB) ---------------------------------- */

function AlbFields({
  resource,
  pricing,
  onPatch,
}: {
  resource: Extract<Resource, { kind: "alb" }>;
  pricing: PricingData;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const region = getRegion(pricing, resource.regionId);
  const isNlb = resource.lbType === "nlb";
  const hourly = region.alb.hourly?.price ?? 0.025;
  const cuRate = isNlb
    ? (region.alb.lcu?.price ?? 0.008) * 0.75
    : (region.alb.lcu?.price ?? 0.008);
  const cuName = isNlb ? "NLCU" : "LCU";

  return (
    <>
      <div>
        <SectionLabel
          hint={
            isNlb
              ? "초저지연 L4 트래픽 (TCP/UDP/TLS · 고정 IP)"
              : "HTTP/HTTPS L7 고성능 라우팅 · 헤더/경로 분기"
          }
        >
          로드 밸런서 유형
        </SectionLabel>
        <Segmented
          ariaLabel="로드 밸런서 종류"
          value={resource.lbType ?? "alb"}
          onChange={(lbType) => onPatch({ lbType })}
          options={[
            { value: "alb", label: "Application Load Balancer (ALB · L7)" },
            { value: "nlb", label: "Network Load Balancer (NLB · L4 · 25%↓)" },
          ]}
        />
        <p className="mt-2 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
          기본 요금: {formatUsd(hourly, 4)}/hr · {cuName} 요율: {formatUsd(cuRate, 4)}/{cuName}-hr
          {isNlb && " (ALB LCU 대비 약 25% 저렴)"}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            로드 밸런서 수량
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            {isNlb ? "NLB 인스턴스 시간당 기본 요금 반영" : "ALB 인스턴스 시간당 기본 요금 반영"}
          </p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={99}
          onChange={(qty) => onPatch({ qty })}
          label={`${isNlb ? "NLB" : "ALB"} 수량`}
        />
      </div>

      <RangeField
        label="월간 가동 시간"
        hint="AWS 표준 연평균 730h · 31일 기준 최대 744h"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label={isNlb ? "평균 NLCU (Network LCU)" : "평균 LCU (Load Balancer Capacity Unit)"}
        hint={
          isNlb
            ? "TCP 신규(800개/s), 활성(10만개), 대역폭(1GB/h) 중 최대치 소모"
            : "새 연결(25개/s), 활성(3,000개), 대역폭(1GB/h), 규칙(1,000개/s) 중 최대치 소모"
        }
        value={resource.lcu}
        onChange={(lcu) => onPatch({ lcu })}
        min={0}
        max={100}
        step={0.5}
        unit={cuName}
        format={(value) => formatNumber(value, 1)}
      />
    </>
  );
}

/* ---------------------------- Transit Gateway ----------------------------- */

function TgwFields({
  resource,
  onPatch,
}: {
  resource: TgwResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const attachRate = getTgwAttachmentHourly(resource.regionId);

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            TGW 연결 수 (Attachments)
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            연결된 VPC · VPN · Direct Connect Gateway 개수 ({formatUsd(attachRate, 2)}/연결-시간)
          </p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={200}
          onChange={(qty) => onPatch({ qty })}
          label="TGW 연결 수량"
        />
      </div>

      <RangeField
        label="월간 가동 시간"
        hint="AWS 표준 연평균 730h · 31일 기준 최대 744h"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label="월간 처리 데이터 (Data Processed)"
        hint="Transit Gateway로 전송된 총 트래픽 · GB당 $0.02 과금"
        value={resource.dataProcessedGb}
        onChange={(dataProcessedGb) => onPatch({ dataProcessedGb })}
        min={0}
        max={102400}
        step={50}
        unit="GB"
      />
    </>
  );
}

/* --------------------------- Site-to-Site VPN ----------------------------- */

function VpnFields({
  resource,
  onPatch,
}: {
  resource: VpnResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const isAccelerated = Boolean(resource.accelerated);
  const hourlyRate = 0.05 + (isAccelerated ? 0.05 : 0);

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            Site-to-Site VPN 연결 수
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            연결 1개당 이중화 IPsec 터널 2개 기본 포함 ({formatUsd(hourlyRate, 2)}/연결-시간)
          </p>
        </div>
        <Stepper
          value={resource.qty}
          min={1}
          max={99}
          onChange={(qty) => onPatch({ qty })}
          label="VPN 연결 수량"
        />
      </div>

      <Toggle
        checked={isAccelerated}
        onChange={(accelerated) => onPatch({ accelerated })}
        label="가속화 VPN (Accelerated Site-to-Site VPN)"
        hint={
          isAccelerated
            ? "가속 활성화됨 · AWS Global Accelerator 엣지 경유 ($0.10/연결-시간)"
            : "AWS Global Accelerator 엣지 네트워크 경유 · 연결당 +$0.05/시간 추가"
        }
      />

      <RangeField
        label="월간 가동 시간"
        hint="AWS 표준 연평균 730h · 31일 기준 최대 744h"
        value={resource.hours}
        onChange={(hours) => onPatch({ hours })}
        min={1}
        max={744}
        unit="h"
      />

      <RangeField
        label="VPN 아웃바운드 데이터 전송"
        hint="AWS → 온프레미스 송신 트래픽 (리전 인터넷 아웃바운드 구간 요율 적용 · 인바운드 무료)"
        value={resource.dataOutGb}
        onChange={(dataOutGb) => onPatch({ dataOutGb })}
        min={0}
        max={50000}
        step={50}
        unit="GB"
      />
    </>
  );
}

/* ---------------------------- Amazon Bedrock ------------------------------ */

function BedrockFields({
  resource,
  onPatch,
}: {
  resource: BedrockResource;
  onPatch: (values: Record<string, unknown>) => void;
}) {
  const inferenceMode: BedrockInferenceMode = resource.inferenceMode ?? "global";
  const { model, inputRate, outputRate, modeLabel, isRegionalFallback } = getBedrockUnitRates(
    resource.modelId || DEFAULT_BEDROCK_MODEL_ID,
    resource.regionId,
    inferenceMode,
  );

  const providers: Array<{ label: string; models: (typeof BEDROCK_MODELS)[string][] }> = [
    {
      label: "Anthropic (Claude 5.5 · 4.6 · Fable)",
      models: Object.values(BEDROCK_MODELS).filter((m) => m.provider === "Anthropic"),
    },
    {
      label: "OpenAI (GPT-6 CRIS · gpt-oss Regional)",
      models: Object.values(BEDROCK_MODELS).filter((m) => m.provider === "OpenAI"),
    },
  ];

  const supportedRegions = model.regionalRates ? Object.keys(model.regionalRates) : [];

  return (
    <>
      <div>
        <div className="flex items-center justify-between">
          <SectionLabel hint={`${model.provider} 모델`}>파운데이션 모델 (Foundation Model)</SectionLabel>
          {model.badge && (
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-bold text-fuchsia-600 dark:text-fuchsia-400">
              {model.badge}
            </span>
          )}
        </div>
        <div className="relative mt-1">
          <select
            aria-label="Bedrock 파운데이션 모델"
            value={model.id}
            onChange={(event) => onPatch({ modelId: event.target.value })}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          >
            {providers.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · 입 ${m.inputPerMillionUsd} / 출 ${m.outputPerMillionUsd} per 1M
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{model.description}</p>
        <p className="mt-1 font-mono text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">
          적용 단가 ({modeLabel}): 입력 {formatUsd(inputRate, 3)}/1M 토큰 · 출력 {formatUsd(outputRate, 3)}/1M 토큰
        </p>
      </div>

      {model.pricingScope === "cris" ? (
        <div>
          <SectionLabel hint="Global 1.0× vs Geo +10%">CRIS 라우팅 (Cross-Region Inference)</SectionLabel>
          <Segmented
            ariaLabel="Bedrock CRIS 라우팅 모드"
            value={inferenceMode}
            onChange={(next) => onPatch({ inferenceMode: next })}
            options={[
              { value: "global", label: "Global CRIS (기본 1.0×)" },
              { value: "geo", label: "Geo CRIS (+10% 리전 경계)" },
            ]}
          />
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border px-3.5 py-3 text-xs leading-relaxed",
            isRegionalFallback
              ? "border-amber-500/30 bg-amber-500/[0.07] text-amber-800 dark:text-amber-200"
              : "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-800 dark:text-emerald-200",
          )}
        >
          {isRegionalFallback ? (
            <>
              <p className="font-semibold">
                선택한 리전({resource.regionId})은 Open-Weight 리전별 요율표에 미지원 상태입니다.
              </p>
              <p className="mt-1 text-[11px] opacity-90">
                현재 US 기본 단가(입력 {formatUsd(model.inputPerMillionUsd, 3)} / 출력{" "}
                {formatUsd(model.outputPerMillionUsd, 3)} per 1M)로 폴백 계산됩니다. 공식 지원 리전:{" "}
                <code className="font-mono">{supportedRegions.join(", ")}</code>
              </p>
            </>
          ) : (
            <p className="text-[11px]">
              <strong>{resource.regionId}</strong> 리전의 Open-Weight 공식 리전 단가가 적용되었습니다.
            </p>
          )}
        </div>
      )}

      <RangeField
        label="월간 입력 토큰 (Input Tokens)"
        hint={`프롬프트 및 컨텍스트 · 약 ${(resource.monthlyInputTokensM * 100).toFixed(0)}만 토큰`}
        value={resource.monthlyInputTokensM}
        onChange={(monthlyInputTokensM) => onPatch({ monthlyInputTokensM })}
        min={0}
        max={500}
        step={0.5}
        unit="M 토큰"
        format={(v) => formatNumber(v, 1)}
      />

      <RangeField
        label="월간 출력 토큰 (Output Tokens)"
        hint={`모델 생성 답변 (Extended Thinking 추론 토큰 포함) · 약 ${(resource.monthlyOutputTokensM * 100).toFixed(0)}만 토큰`}
        value={resource.monthlyOutputTokensM}
        onChange={(monthlyOutputTokensM) => onPatch({ monthlyOutputTokensM })}
        min={0}
        max={200}
        step={0.5}
        unit="M 토큰"
        format={(v) => formatNumber(v, 1)}
      />

      <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 dark:border-white/[0.07] dark:bg-white/[0.03]">
        <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-600">
          토큰 및 CRIS 라우팅 팁
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          1M(100만) 토큰은 약 75만 영문 단어(A4 약 1,500장) 또는 150만 자의 한국어 텍스트에 해당합니다.
          Global CRIS는 전 세계 AWS 리전으로 자동 라우팅하여 기본 단가(1.0×)로 최대 처리량을 제공하며,
          Geo CRIS는 지정 지리권역(US/EU/APAC) 내 데이터 레지던시를 보장하는 대신 +10% 할증이 적용됩니다.
        </p>
      </div>
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
