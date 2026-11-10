import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Plus, Search, X } from "lucide-react";
import pricingJson from "./data/pricing.json";
import type {
  Category,
  Currency,
  EnvTag,
  PricingData,
  PurchaseOption,
  Resource,
  ResourceSort,
  ServiceKind,
  SupportPlan,
} from "./types";
import { calculateSummary, resourceDetail } from "./lib/calc";
import { decodeShareUrl } from "./lib/export";
import { formatMoney } from "./lib/format";
import {
  applyGravitonMigration,
  buildInsights,
  totalPotentialSavings,
  type InsightAction,
} from "./lib/insights";
import { duplicateResource, migrateResourceToRegion, setResourceQty } from "./lib/resources";
import { type Preset } from "./lib/presets";
import { ENV_META, PURCHASE_OPTIONS, SERVICES } from "./lib/services";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { RegionMatrix } from "./components/RegionMatrix";
import { ResourceCard } from "./components/ResourceCard";
import { EmptyState } from "./components/EmptyState";
import { Insights } from "./components/Insights";
import { ExportPanel } from "./components/ExportPanel";
import { ToastStack } from "./components/Toast";
import { Chip, cn } from "./components/Primitives";

const CostBreakdown = lazy(() =>
  import("./components/CostBreakdown").then((m) => ({ default: m.CostBreakdown })),
);
const ServiceDrawer = lazy(() =>
  import("./components/ServiceDrawer").then((m) => ({ default: m.ServiceDrawer })),
);

const pricing = pricingJson as unknown as PricingData;

const FILTERS: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "compute", label: "Compute" },
  { value: "database", label: "Database" },
  { value: "storage", label: "Storage" },
  { value: "network", label: "Network" },
];

const ENV_FILTERS: { value: "all" | EnvTag; label: string }[] = [
  { value: "all", label: "모든 환경" },
  { value: "prod", label: "PROD" },
  { value: "stage", label: "STAGE" },
  { value: "dev", label: "DEV" },
];

const SORT_OPTIONS: { value: ResourceSort; label: string }[] = [
  { value: "created", label: "추가순" },
  { value: "costDesc", label: "비용 높은순" },
  { value: "costAsc", label: "비용 낮은순" },
  { value: "name", label: "이름순" },
];

interface DrawerState {
  open: boolean;
  initialKind: ServiceKind | null;
  editing: Resource | null;
}

const CLOSED_DRAWER: DrawerState = { open: false, initialKind: null, editing: null };

export default function App() {
  const [resources, setResources] = useLocalStorage<Resource[]>("acs.resources.v1", []);
  const [currency, setCurrency] = useLocalStorage<Currency>("acs.currency.v1", "USD");
  const [fx, setFx] = useLocalStorage<number>("acs.fx.v1", pricing.meta.fxKrwPerUsd);
  const [regionId, setRegionId] = useLocalStorage<string>(
    "acs.region.v1",
    pricing.meta.regions[0].id,
  );
  const [purchaseOption, setPurchaseOption] = useLocalStorage<PurchaseOption>(
    "acs.purchaseOption.v1",
    "onDemand",
  );
  const [supportPlan, setSupportPlan] = useLocalStorage<SupportPlan>(
    "acs.supportPlan.v1",
    "basic",
  );
  const [includeVat, setIncludeVat] = useLocalStorage<boolean>("acs.includeVat.v1", false);
  const [budgetUsd, setBudgetUsd] = useLocalStorage<number>("acs.budgetUsd.v1", 0);

  const [filter, setFilter] = useState<"all" | Category>("all");
  const [envFilter, setEnvFilter] = useState<"all" | EnvTag>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ResourceSort>("created");
  const [drawer, setDrawer] = useState<DrawerState>(CLOSED_DRAWER);
  const { theme, toggle } = useTheme();
  const { toasts, push: pushToast, dismiss } = useToast();

  // Restore shared state from URL (?s=...) if present on initial load
  useEffect(() => {
    const shared = decodeShareUrl(window.location.search);
    if (!shared) return;
    setResources(shared.resources);
    if (shared.currency) setCurrency(shared.currency);
    if (shared.fx) setFx(shared.fx);
    if (shared.purchaseOption) setPurchaseOption(shared.purchaseOption);
    if (shared.supportPlan) setSupportPlan(shared.supportPlan);
    if (typeof shared.includeVat === "boolean") setIncludeVat(shared.includeVat);
    pushToast(`공유 링크에서 ${shared.resources.length}개 리소스 견적을 불러왔습니다.`, {
      tone: "success",
    });
  }, []);

  const closeDrawer = useCallback(() => setDrawer(CLOSED_DRAWER), []);
  const openCatalog = useCallback(
    () => setDrawer({ open: true, initialKind: null, editing: null }),
    [],
  );
  const openEdit = useCallback(
    (resource: Resource) => setDrawer({ open: true, initialKind: null, editing: resource }),
    [],
  );

  // Global keyboard shortcuts (Ctrl+K or '/' to open service catalog)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCatalog();
        return;
      }
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (!isEditable && !drawer.open && event.key === "/") {
        event.preventDefault();
        openCatalog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCatalog, drawer.open]);

  const summary = useMemo(
    () => calculateSummary(resources, pricing, purchaseOption, supportPlan, includeVat),
    [resources, purchaseOption, supportPlan, includeVat],
  );
  const insights = useMemo(
    () => buildInsights(resources, pricing, purchaseOption),
    [resources, purchaseOption],
  );
  const savings = useMemo(() => totalPotentialSavings(insights), [insights]);

  const costById = useMemo(
    () => Object.fromEntries(summary.lines.map((line) => [line.id, line.monthlyUsd])),
    [summary.lines],
  );

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const list = resources.filter((resource) => {
      const matchCategory =
        filter === "all" || SERVICES[resource.kind].category === filter;
      const matchEnv = envFilter === "all" || resource.env === envFilter;
      if (!matchCategory || !matchEnv) return false;
      if (!needle) return true;
      const meta = SERVICES[resource.kind];
      const detail = resourceDetail(resource, pricing);
      const haystack = `${resource.label ?? ""} ${meta.title} ${meta.eyebrow} ${detail} ${resource.regionId}`.toLowerCase();
      return haystack.includes(needle);
    });

    if (sortBy === "costDesc") {
      return [...list].sort((a, b) => (costById[b.id] ?? 0) - (costById[a.id] ?? 0));
    }
    if (sortBy === "costAsc") {
      return [...list].sort((a, b) => (costById[a.id] ?? 0) - (costById[b.id] ?? 0));
    }
    if (sortBy === "name") {
      return [...list].sort((a, b) => {
        const nameA = a.label || SERVICES[a.kind].title;
        const nameB = b.label || SERVICES[b.kind].title;
        return nameA.localeCompare(nameB, "ko-KR");
      });
    }
    return list;
  }, [resources, filter, envFilter, searchQuery, sortBy, costById]);

  const hasAnyEnvTag = useMemo(() => resources.some((r) => Boolean(r.env)), [resources]);

  const handleBulkMigrateRegion = useCallback(
    (targetRegionId: string) => {
      const snapshot = resources;
      const next = resources.map((r) => migrateResourceToRegion(r, targetRegionId, pricing));
      setResources(next);
      setRegionId(targetRegionId);
      const regionLabel =
        pricing.meta.regions.find((r) => r.id === targetRegionId)?.label ?? targetRegionId;
      pushToast(`모든 리소스(${resources.length}개)의 리전을 ${regionLabel}(으)로 일괄 변경했습니다.`, {
        tone: "success",
        actionLabel: "되돌리기",
        onAction: () => setResources(snapshot),
      });
    },
    [resources, setResources, setRegionId, pushToast],
  );

  const handleRegionChange = useCallback(
    (nextRegionId: string) => {
      setRegionId(nextRegionId);
      const diffCount = resources.filter((r) => r.regionId !== nextRegionId).length;
      if (diffCount > 0) {
        const regionLabel =
          pricing.meta.regions.find((r) => r.id === nextRegionId)?.label ?? nextRegionId;
        const snapshot = resources;
        pushToast(`기본 리전이 ${regionLabel}(으)로 변경되었습니다.`, {
          actionLabel: `기존 ${diffCount}개도 일괄 변경`,
          onAction: () => {
            const migrated = snapshot.map((r) =>
              migrateResourceToRegion(r, nextRegionId, pricing),
            );
            setResources(migrated);
          },
        });
      }
    },
    [resources, setRegionId, setResources, pushToast],
  );

  const handleApplyInsightAction = useCallback(
    (action: InsightAction) => {
      const snapshot = resources;
      const prevPurchase = purchaseOption;
      if (action.type === "migrateGraviton") {
        const { next, count } = applyGravitonMigration(resources, pricing);
        if (count > 0) {
          setResources(next);
          pushToast(`${count}개 리소스를 동급 Graviton(Arm) 인스턴스로 전환했습니다.`, {
            tone: "success",
            actionLabel: "되돌리기",
            onAction: () => setResources(snapshot),
          });
        }
      } else if (action.type === "switchPurchaseOption") {
        setPurchaseOption(action.option);
        const label =
          PURCHASE_OPTIONS.find((item) => item.value === action.option)?.label ?? action.option;
        pushToast(`${label} 요율을 전체 구성에 적용했습니다.`, {
          tone: "success",
          actionLabel: "되돌리기",
          onAction: () => setPurchaseOption(prevPurchase),
        });
      } else if (action.type === "switchValkey") {
        setResources((current) =>
          current.map((r) =>
            r.kind === "elasticache" && r.engine === "redis" ? { ...r, engine: "valkey" } : r,
          ),
        );
        pushToast("ElastiCache 엔진을 Valkey(20% 할인)로 전환했습니다.", {
          tone: "success",
          actionLabel: "되돌리기",
          onAction: () => setResources(snapshot),
        });
      } else if (action.type === "switchLambdaArm") {
        setResources((current) =>
          current.map((r) =>
            r.kind === "lambda" && r.arch === "x86" ? { ...r, arch: "arm64" } : r,
          ),
        );
        pushToast("AWS Lambda 아키텍처를 Arm64(Graviton2)로 전환했습니다.", {
          tone: "success",
          actionLabel: "되돌리기",
          onAction: () => setResources(snapshot),
        });
      } else if (action.type === "switchEcsArm") {
        setResources((current) =>
          current.map((r) =>
            r.kind === "ecs" && r.arch === "x86" ? { ...r, arch: "arm64" } : r,
          ),
        );
        pushToast("ECS Fargate 태스크를 Arm64(Graviton)로 전환했습니다 (20% 할인).", {
          tone: "success",
          actionLabel: "되돌리기",
          onAction: () => setResources(snapshot),
        });
      } else if (action.type === "switchEcsSpot") {
        setResources((current) =>
          current.map((r) =>
            r.kind === "ecs" && (r.env === "dev" || r.env === "stage")
              ? { ...r, launchType: "fargateSpot" }
              : r,
          ),
        );
        pushToast("비프로덕션 ECS 태스크를 Fargate Spot으로 전환했습니다 (최대 70% 할인).", {
          tone: "success",
          actionLabel: "되돌리기",
          onAction: () => setResources(snapshot),
        });
      }
    },
    [resources, purchaseOption, setResources, setPurchaseOption, pushToast],
  );

  const handleSave = useCallback(
    (resource: Resource) => {
      const exists = resources.some((item) => item.id === resource.id);
      setResources((current) =>
        current.some((item) => item.id === resource.id)
          ? current.map((item) => (item.id === resource.id ? resource : item))
          : [...current, resource],
      );
      pushToast(
        exists
          ? `${resource.label || SERVICES[resource.kind].title} 사양을 업데이트했습니다.`
          : `${resource.label || SERVICES[resource.kind].title}을(를) 추가했습니다.`,
        { tone: "success" },
      );
      closeDrawer();
    },
    [resources, setResources, pushToast, closeDrawer],
  );

  const handleDuplicate = useCallback(
    (resource: Resource) => {
      const copy = duplicateResource(resource);
      setResources((current) => [...current, copy]);
      pushToast(`${resource.label || SERVICES[resource.kind].title}을(를) 복제했습니다.`, {
        tone: "success",
      });
    },
    [setResources, pushToast],
  );

  const handleDelete = useCallback(
    (resource: Resource) => {
      const index = resources.findIndex((item) => item.id === resource.id);
      if (index < 0) return;
      const snapshot = resources;
      setResources((current) => current.filter((item) => item.id !== resource.id));
      pushToast(`${resource.label || SERVICES[resource.kind].title}을(를) 삭제했습니다.`, {
        actionLabel: "되돌리기",
        onAction: () => setResources(snapshot),
      });
    },
    [resources, setResources, pushToast],
  );

  const handleQty = useCallback(
    (resource: Resource, qty: number) => {
      setResources((current) =>
        current.map((item) => (item.id === resource.id ? setResourceQty(item, qty) : item)),
      );
    },
    [setResources],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      const snapshot = resources;
      const next = preset.build(regionId);
      setResources(next);
      pushToast(`${preset.title} 프리셋을 적용했습니다.`, {
        tone: "success",
        actionLabel: snapshot.length ? "되돌리기" : undefined,
        onAction: snapshot.length ? () => setResources(snapshot) : undefined,
      });
      window.setTimeout(() => {
        document.getElementById("resources")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    },
    [resources, regionId, setResources, pushToast],
  );

  const handleReset = useCallback(() => {
    if (!resources.length) return;
    const snapshot = resources;
    setResources([]);
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    pushToast("모든 리소스를 초기화했습니다.", {
      tone: "warn",
      actionLabel: "되돌리기",
      onAction: () => setResources(snapshot),
    });
  }, [resources, setResources, pushToast]);

  const handleImport = useCallback(
    (imported: Resource[]) => {
      setResources(imported);
    },
    [setResources],
  );

  const scrollToPresets = () => {
    document.getElementById("presets")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-zinc-900 dark:bg-[#08080b] dark:text-zinc-100">
      <Header
        totalUsd={summary.monthlyUsd}
        currency={currency}
        fx={fx}
        onCurrencyChange={setCurrency}
        theme={theme}
        onToggleTheme={toggle}
        onAdd={openCatalog}
      />

      <Hero
        pricing={pricing}
        regionId={regionId}
        onRegionChange={handleRegionChange}
        onBulkMigrateRegion={handleBulkMigrateRegion}
        resources={resources}
        purchaseOption={purchaseOption}
        onPurchaseOptionChange={setPurchaseOption}
        currency={currency}
        fx={fx}
        onApplyPreset={applyPreset}
      />

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {resources.length > 0 && (
          <RegionMatrix
            resources={resources}
            pricing={pricing}
            currentMonthlyUsd={summary.monthlyUsd}
            activeRegionId={regionId}
            purchaseOption={purchaseOption}
            supportPlan={supportPlan}
            includeVat={includeVat}
            currency={currency}
            fx={fx}
            onMigrateAll={handleBulkMigrateRegion}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <section className="space-y-4 lg:col-span-8">
            <div id="resources" className="scroll-mt-24 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-zinc-900 dark:text-white">
                    리소스 구성
                  </h2>
                  <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-500 tabular-nums dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                    {resources.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  수량, 별칭, 약정 옵션을 바꾸면 총액과 Graviton/약정 인사이트가 즉시 갱신됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] text-zinc-400 sm:block dark:text-zinc-600">
                  월 합계
                </span>
                <span className="font-mono text-sm font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                  {formatMoney(summary.monthlyUsd, currency, fx)}
                </span>
                <button
                  type="button"
                  onClick={openCatalog}
                  title="서비스 추가 (Ctrl+K 또는 /)"
                  className="no-print inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
                >
                  <Plus size={13} />
                  추가
                  <kbd className="ml-1 hidden rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[9px] text-zinc-400 sm:inline-block dark:border-white/10 dark:bg-white/5">
                    Ctrl+K
                  </kbd>
                </button>
              </div>
            </div>

            {resources.length > 0 && (
              <div className="no-print space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FILTERS.map((item) => (
                      <Chip
                        key={item.value}
                        active={filter === item.value}
                        onClick={() => setFilter(item.value)}
                      >
                        {item.label}
                        {item.value !== "all" && (
                          <span className="ml-1 text-[9px] opacity-60">
                            {
                              resources.filter(
                                (resource) => SERVICES[resource.kind].category === item.value,
                              ).length
                            }
                          </span>
                        )}
                      </Chip>
                    ))}
                  </div>

                  {hasAnyEnvTag && (
                    <div className="flex items-center gap-1">
                      {ENV_FILTERS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setEnvFilter(item.value)}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-[10px] font-bold transition",
                            envFilter === item.value
                              ? "border-indigo-500 bg-indigo-600 text-white"
                              : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400",
                          )}
                        >
                          {item.value === "all" ? item.label : ENV_META[item.value].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 실시간 검색 & 정렬 바 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                    <Search
                      size={13}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="별칭, 서비스명, 인스턴스 검색..."
                      aria-label="리소스 검색"
                      className="h-8 w-full rounded-xl border border-zinc-200 bg-white pr-7 pl-8 text-xs text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-600"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="검색어 지우기"
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={12} className="text-zinc-400" />
                    <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className={cn(
                            "rounded-lg px-2 py-1 text-[10px] font-semibold transition",
                            sortBy === option.value
                              ? "bg-indigo-600 text-white"
                              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={cn("grid gap-4", filtered.length > 0 && "sm:grid-cols-2")}>
              {resources.length === 0 ? (
                <EmptyState onAdd={openCatalog} onPreset={scrollToPresets} />
              ) : filtered.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-white/10">
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    선택한 필터나 검색 조건에 해당하는 리소스가 없습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("all");
                      setEnvFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    필터 초기화 및 전체 보기
                  </button>
                </div>
              ) : (
                filtered.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    monthlyUsd={costById[resource.id] ?? 0}
                    pricing={pricing}
                    currency={currency}
                    fx={fx}
                    onEdit={openEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onQty={handleQty}
                  />
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/70 bg-white/50 px-4 py-3 text-[10px] leading-relaxed text-zinc-400 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-600">
              <p>
                요율 스냅샷: {new Date(pricing.meta.generatedAt).toLocaleDateString("ko-KR")} · 월{" "}
                {pricing.meta.hoursPerMonth}시간 · USD 기준
              </p>
              <a
                href="https://calculator.aws/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition hover:text-indigo-500 dark:text-zinc-500 dark:decoration-zinc-700 dark:hover:text-indigo-400"
              >
                AWS Pricing Calculator에서 확인
              </a>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-20">
              <Suspense
                fallback={
                  <div className="h-[320px] animate-pulse rounded-2xl border border-zinc-200/80 bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.03]" />
                }
              >
                <CostBreakdown
                  summary={summary}
                  currency={currency}
                  fx={fx}
                  purchaseOption={purchaseOption}
                  supportPlan={supportPlan}
                  onSupportPlanChange={setSupportPlan}
                  includeVat={includeVat}
                  onIncludeVatChange={setIncludeVat}
                  budgetUsd={budgetUsd}
                  onBudgetUsdChange={setBudgetUsd}
                />
              </Suspense>
              <Insights
                insights={insights}
                totalSavingsUsd={savings}
                currency={currency}
                fx={fx}
                onApplyAction={handleApplyInsightAction}
              />
              <ExportPanel
                resources={resources}
                summary={summary}
                pricing={pricing}
                currency={currency}
                fx={fx}
                purchaseOption={purchaseOption}
                supportPlan={supportPlan}
                includeVat={includeVat}
                onFxChange={setFx}
                onImport={handleImport}
                onReset={handleReset}
                pushToast={pushToast}
              />
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-zinc-200/70 py-8 dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-black text-white">
              C
            </span>
            <div>
              <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                AWS Cost Studio
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                AWS Pricing Calculator 공개 미터 요율 기반 · 오프라인 계산
              </p>
            </div>
          </div>
          <p className="max-w-lg text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-600">
            실제 청구 금액은 세금, 크레딧, Savings Plans, 프라이빗 요금제에 따라 달라질 수 있습니다. 이
            도구는 견적 보조용이며 AWS의 공식 견적을 대체하지 않습니다.
          </p>
        </div>
      </footer>

      {drawer.open && (
        <Suspense fallback={null}>
          <ServiceDrawer
            open={drawer.open}
            initialKind={drawer.initialKind}
            editing={drawer.editing}
            pricing={pricing}
            defaultRegionId={regionId}
            purchaseOption={purchaseOption}
            currency={currency}
            fx={fx}
            onClose={closeDrawer}
            onSave={handleSave}
          />
        </Suspense>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
