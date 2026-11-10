import type {
  CostSummary,
  Currency,
  EnvTag,
  PricingData,
  PurchaseOption,
  Resource,
  ServiceKind,
  SupportPlan,
} from "../types";
import { ENV_META, PURCHASE_OPTIONS, SERVICES, SUPPORT_PLANS } from "./services";
import { formatMoney, formatUsd } from "./format";
import { getRegion, resourceDetail } from "./calc";

const VALID_KINDS: ServiceKind[] = [
  "ec2",
  "ebs",
  "rds",
  "dynamodb",
  "elasticache",
  "s3",
  "lambda",
  "eks",
  "ecs",
  "cloudfront",
  "nat",
  "alb",
  "tgw",
  "vpn",
  "dataTransfer",
];

const VALID_ENVS: EnvTag[] = ["prod", "stage", "dev"];

export function buildMarkdownReport(
  resources: Resource[],
  summary: CostSummary,
  currency: Currency,
  fx: number,
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
  supportPlan: SupportPlan = "basic",
  includeVat = false,
): string {
  const now = new Date().toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" });
  const purchaseMeta =
    PURCHASE_OPTIONS.find((item) => item.value === purchaseOption) ?? PURCHASE_OPTIONS[0];
  const supportMeta =
    SUPPORT_PLANS.find((item) => item.value === supportPlan) ?? SUPPORT_PLANS[0];
  const rows = resources.map((resource, index) => {
    const region = getRegion(pricing, resource.regionId);
    const line = summary.lines.find((l) => l.id === resource.id);
    const namePart = resource.label
      ? `${SERVICES[resource.kind].title} (${resource.label})`
      : SERVICES[resource.kind].title;
    const envPart = resource.env ? `[${ENV_META[resource.env].label}] ` : "";
    return `| ${index + 1} | ${envPart}${namePart} | ${region.label} (${region.id}) | ${resourceDetail(resource, pricing)} | ${formatUsd(line?.monthlyUsd ?? 0)} |`;
  });

  if (!rows.length) rows.push("| — | — | — | 아직 추가된 리소스가 없습니다 | $0.00 |");

  const spDiscountLine =
    purchaseOption !== "onDemand" && summary.onDemandMonthlyUsd > summary.monthlyUsd
      ? `- 약정 절감액 (vs On-Demand): -${formatMoney(summary.onDemandMonthlyUsd - summary.monthlyUsd, currency, fx)} /월`
      : null;

  return [
    "# AWS Cost Studio 견적 리포트",
    "",
    `> 생성일: ${now}`,
    `> 요금 모델: ${purchaseMeta.label} · Support: ${supportMeta.label} · 부가세(VAT): ${includeVat ? "10% 포함" : "미포함"}`,
    `> 통화: ${currency} · 참고 환율: 1 USD = ${fx.toLocaleString("ko-KR")} KRW`,
    `> 산출 기준: 월 730시간 · AWS Pricing Calculator 실측 요율`,
    "",
    "## 월간 요약",
    "",
    `- **월 최종 예상 비용: ${formatMoney(summary.monthlyUsd, currency, fx)}**`,
    `- 연 예상 비용: ${formatMoney(summary.annualUsd, currency, fx)}`,
    `- 리소스 소계: ${formatMoney(summary.subtotalUsd, currency, fx)}`,
    ...(summary.supportUsd > 0
      ? [`- AWS Support (${supportMeta.shortLabel}): ${formatMoney(summary.supportUsd, currency, fx)}`]
      : []),
    ...(summary.vatUsd > 0
      ? [`- 부가세 (VAT 10%): ${formatMoney(summary.vatUsd, currency, fx)}`]
      : []),
    ...(spDiscountLine ? [spDiscountLine] : []),
    `- 리소스 수: ${resources.length}개`,
    "",
    "## 리소스 상세",
    "",
    "| # | 서비스 (별칭) | 리전 | 사양 | 월 비용 |",
    "|---|---------------|------|------|---------|",
    ...rows,
    "",
    "## 카테고리별 비중",
    "",
    ...Object.entries(summary.byCategory)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => {
        const label =
          { compute: "Compute", database: "Database", storage: "Storage", network: "Network" }[
            key
          ] ?? key;
        const pct = summary.subtotalUsd ? ((value / summary.subtotalUsd) * 100).toFixed(1) : "0.0";
        return `- ${label}: ${formatUsd(value)} (${pct}%)`;
      }),
    "",
    "---",
    "AWS Cost Studio · calculator.aws 공개 요율 기반 · 실제 청구서와 차이가 있을 수 있습니다.",
  ].join("\n");
}

function escapeCsvCell(value: string | number): string {
  const strVal = String(value ?? "");
  if (/[",\n\r]/.test(strVal)) {
    return `"${strVal.replace(/"/g, '""')}"`;
  }
  return strVal;
}

export function downloadCsv(
  resources: Resource[],
  summary: CostSummary,
  fx: number,
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
  supportPlan: SupportPlan = "basic",
  includeVat = false,
): void {
  const headers = [
    "번호",
    "환경(ENV)",
    "카테고리",
    "서비스",
    "별칭(메모)",
    "리전",
    "상세 사양",
    "월 비용(USD)",
    "월 비용(KRW)",
  ];

  const rows: (string | number)[][] = resources.map((resource, index) => {
    const region = getRegion(pricing, resource.regionId);
    const line = summary.lines.find((l) => l.id === resource.id);
    const usd = line?.monthlyUsd ?? 0;
    const krw = Math.round(usd * fx);
    return [
      index + 1,
      resource.env ? ENV_META[resource.env].label : "-",
      SERVICES[resource.kind].category.toUpperCase(),
      SERVICES[resource.kind].title,
      resource.label ?? "-",
      `${region.label} (${region.id})`,
      resourceDetail(resource, pricing),
      usd.toFixed(2),
      krw,
    ];
  });

  rows.push([]);
  rows.push(["", "", "", "요약 항목", "설정값", "", "", "월 비용(USD)", "월 비용(KRW)"]);
  rows.push([
    "",
    "",
    "",
    "리소스 소계 (Subtotal)",
    purchaseOption,
    "",
    "",
    summary.subtotalUsd.toFixed(2),
    Math.round(summary.subtotalUsd * fx),
  ]);
  if (summary.supportUsd > 0) {
    rows.push([
      "",
      "",
      "",
      "AWS Support 비용",
      supportPlan.toUpperCase(),
      "",
      "",
      summary.supportUsd.toFixed(2),
      Math.round(summary.supportUsd * fx),
    ]);
  }
  if (summary.vatUsd > 0 || includeVat) {
    rows.push([
      "",
      "",
      "",
      "부가세 (VAT 10%)",
      "10%",
      "",
      "",
      summary.vatUsd.toFixed(2),
      Math.round(summary.vatUsd * fx),
    ]);
  }
  rows.push([
    "",
    "",
    "",
    "월 최종 합계 (Total Monthly)",
    `환율 1 USD = ${fx} KRW`,
    "",
    "",
    summary.monthlyUsd.toFixed(2),
    Math.round(summary.monthlyUsd * fx),
  ]);
  rows.push([
    "",
    "",
    "",
    "연간 예상 합계 (Total Annual)",
    "12개월 기준",
    "",
    "",
    summary.annualUsd.toFixed(2),
    Math.round(summary.annualUsd * fx),
  ]);

  const csvContent =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aws-cost-studio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(
  resources: Resource[],
  currency: Currency,
  fx: number,
  summary: CostSummary,
  purchaseOption: PurchaseOption = "onDemand",
  supportPlan: SupportPlan = "basic",
  includeVat = false,
): void {
  const payload = {
    app: "aws-cost-studio",
    version: 3,
    exportedAt: new Date().toISOString(),
    currency,
    fxKrwPerUsd: fx,
    purchaseOption,
    supportPlan,
    includeVat,
    summary: {
      subtotalUsd: Number(summary.subtotalUsd.toFixed(4)),
      supportUsd: Number(summary.supportUsd.toFixed(4)),
      vatUsd: Number(summary.vatUsd.toFixed(4)),
      monthlyUsd: Number(summary.monthlyUsd.toFixed(4)),
      annualUsd: Number(summary.annualUsd.toFixed(4)),
    },
    resources,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aws-cost-studio-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

export function parseImportedResources(raw: unknown): Resource[] {
  const candidate = Array.isArray(raw) ? raw : (raw as { resources?: unknown })?.resources;
  if (!Array.isArray(candidate)) throw new Error("resources 배열을 찾을 수 없습니다.");

  const resources = candidate
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .filter((item) => VALID_KINDS.includes(item.kind as ServiceKind))
    .slice(0, 100)
    .map((item, index): Resource => {
      const kind = item.kind as ServiceKind;
      const regionId = str(item.regionId, "ap-northeast-2");
      const id = str(item.id, `imported_${Date.now()}_${index}`);
      const createdAt = num(item.createdAt, Date.now() + index);
      const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : undefined;
      const env = VALID_ENVS.includes(item.env as EnvTag) ? (item.env as EnvTag) : undefined;
      const b = { id, regionId, createdAt, label, env };

      switch (kind) {
        case "ec2":
          return {
            ...b,
            kind,
            instanceType: str(item.instanceType, "t4g.medium"),
            qty: Math.max(1, num(item.qty, 1)),
            utilization: Math.min(100, Math.max(1, num(item.utilization, 100))),
          };
        case "ebs":
          return {
            ...b,
            kind,
            volumeType: (["gp3", "gp2", "io1", "io2", "st1", "sc1"] as const).includes(
              item.volumeType as never,
            )
              ? (item.volumeType as never)
              : "gp3",
            sizeGb: Math.max(1, num(item.sizeGb, 100)),
            iops: Math.max(0, num(item.iops, 3000)),
            throughput: Math.max(0, num(item.throughput, 125)),
            qty: Math.max(1, num(item.qty, 1)),
          };
        case "rds":
          return {
            ...b,
            kind,
            engine: item.engine === "mysql" ? "mysql" : "postgres",
            deploymentMode: item.deploymentMode === "serverlessV2" ? "serverlessV2" : "instance",
            acu: Math.max(0.5, Math.min(128, num(item.acu, 2))),
            instanceType: str(item.instanceType, "db.t4g.micro"),
            multiAz: Boolean(item.multiAz),
            storageGb: Math.max(20, num(item.storageGb, 20)),
            storageType: (["gp3", "gp2", "io1", "io2"] as const).includes(item.storageType as never)
              ? (item.storageType as never)
              : "gp3",
            iops: Math.max(0, num(item.iops, 3000)),
            throughput: Math.max(0, num(item.throughput, 125)),
            qty: Math.max(1, num(item.qty, 1)),
          };
        case "dynamodb":
          return {
            ...b,
            kind,
            capacityMode: item.capacityMode === "provisioned" ? "provisioned" : "onDemand",
            storageGb: Math.max(0, num(item.storageGb, 50)),
            writeUnits: Math.max(0, num(item.writeUnits, 10)),
            readUnits: Math.max(0, num(item.readUnits, 50)),
            includeFreeTier: item.includeFreeTier !== false,
          };
        case "elasticache":
          return {
            ...b,
            kind,
            engine: item.engine === "redis" ? "redis" : "valkey",
            nodeType: str(item.nodeType, "cache.t4g.medium"),
            qty: Math.max(1, num(item.qty, 1)),
            replicas: Math.max(0, Math.min(5, num(item.replicas, 1))),
            backupGb: Math.max(0, num(item.backupGb, 0)),
          };
        case "s3":
          return {
            ...b,
            kind,
            storageClass: (
              [
                "standard",
                "standardIA",
                "onezoneIA",
                "glacierIR",
                "glacierFlexible",
                "deepArchive",
              ] as const
            ).includes(item.storageClass as never)
              ? (item.storageClass as never)
              : "standard",
            storageGb: Math.max(0, num(item.storageGb, 100)),
            putRequests: Math.max(0, num(item.putRequests, 0)),
            getRequests: Math.max(0, num(item.getRequests, 0)),
            retrievalGb: Math.max(0, num(item.retrievalGb, 0)),
          };
        case "lambda":
          return {
            ...b,
            kind,
            arch: item.arch === "x86" ? "x86" : "arm64",
            memoryMb: Math.max(128, Math.min(10240, num(item.memoryMb, 512))),
            durationMs: Math.max(1, num(item.durationMs, 120)),
            invocations: Math.max(0, num(item.invocations, 5_000_000)),
            includeFreeTier: item.includeFreeTier !== false,
            apiGatewayRequests: Math.max(0, num(item.apiGatewayRequests, 5_000_000)),
          };
        case "eks":
          return {
            ...b,
            kind,
            clusters: Math.max(1, num(item.clusters, 1)),
            extendedSupport: Boolean(item.extendedSupport),
            workerInstanceType: str(item.workerInstanceType, "m6g.large"),
            workerQty: Math.max(0, num(item.workerQty, 2)),
          };
        case "ecs":
          return {
            ...b,
            kind,
            arch: item.arch === "x86" ? "x86" : "arm64",
            launchType: item.launchType === "fargateSpot" ? "fargateSpot" : "fargate",
            qty: Math.max(1, num(item.qty, 1)),
            hours: Math.min(744, Math.max(1, num(item.hours, 730))),
            vcpu: [0.25, 0.5, 1, 2, 4, 8, 16].includes(num(item.vcpu, 1))
              ? num(item.vcpu, 1)
              : 1,
            memoryGb: Math.max(0.5, Math.min(120, num(item.memoryGb, 2))),
            ephemeralStorageGb: Math.max(20, Math.min(200, num(item.ephemeralStorageGb, 20))),
          };
        case "cloudfront":
          return {
            ...b,
            kind,
            gbOut: Math.max(0, num(item.gbOut, 2048)),
            httpsRequests: Math.max(0, num(item.httpsRequests, 20_000_000)),
          };
        case "nat":
          return {
            ...b,
            kind,
            qty: Math.max(1, num(item.qty, 1)),
            hours: Math.min(744, Math.max(1, num(item.hours, 730))),
            dataGb: Math.max(0, num(item.dataGb, 0)),
          };
        case "alb":
          return {
            ...b,
            kind,
            lbType: item.lbType === "nlb" ? "nlb" : "alb",
            qty: Math.max(1, num(item.qty, 1)),
            hours: Math.min(744, Math.max(1, num(item.hours, 730))),
            lcu: Math.max(0, num(item.lcu, 1)),
          };
        case "tgw":
          return {
            ...b,
            kind,
            qty: Math.max(1, num(item.qty, 3)),
            hours: Math.min(744, Math.max(1, num(item.hours, 730))),
            dataProcessedGb: Math.max(0, num(item.dataProcessedGb, 500)),
          };
        case "vpn":
          return {
            ...b,
            kind,
            qty: Math.max(1, num(item.qty, 1)),
            hours: Math.min(744, Math.max(1, num(item.hours, 730))),
            accelerated: Boolean(item.accelerated),
            dataOutGb: Math.max(0, num(item.dataOutGb, 100)),
          };
        case "dataTransfer":
          return { ...b, kind, gbOut: Math.max(0, num(item.gbOut, 0)) };
        default:
          throw new Error("지원하지 않는 서비스입니다.");
      }
    });

  if (!resources.length) throw new Error("불러올 수 있는 리소스가 없습니다.");
  return resources;
}

export interface SharedState {
  resources: Resource[];
  currency?: Currency;
  fx?: number;
  purchaseOption?: PurchaseOption;
  supportPlan?: SupportPlan;
  includeVat?: boolean;
}

export function encodeShareUrl(state: SharedState): string {
  const payload = JSON.stringify({
    r: state.resources,
    c: state.currency,
    f: state.fx,
    p: state.purchaseOption,
    sp: state.supportPlan,
    v: state.includeVat,
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const url = new URL(window.location.href);
  url.searchParams.set("s", base64Url);
  return url.toString();
}

export function decodeShareUrl(search: string): SharedState | null {
  try {
    const params = new URLSearchParams(search);
    const encoded = params.get("s");
    if (!encoded) return null;
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as {
      r?: unknown;
      c?: Currency;
      f?: number;
      p?: PurchaseOption;
      sp?: SupportPlan;
      v?: boolean;
    };
    const resources = parseImportedResources(decoded.r);
    return {
      resources,
      currency: decoded.c === "KRW" || decoded.c === "USD" ? decoded.c : undefined,
      fx: typeof decoded.f === "number" && Number.isFinite(decoded.f) ? decoded.f : undefined,
      purchaseOption:
        decoded.p === "onDemand" || decoded.p === "sp1yr" || decoded.p === "sp3yr"
          ? decoded.p
          : undefined,
      supportPlan:
        decoded.sp === "basic" || decoded.sp === "developer" || decoded.sp === "business"
          ? decoded.sp
          : undefined,
      includeVat: typeof decoded.v === "boolean" ? decoded.v : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchLiveKrwRate(): Promise<number> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) throw new Error("환율 서버 응답 오류");
  const data = (await response.json()) as { rates?: { KRW?: number } };
  const rate = data?.rates?.KRW;
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error("유효한 KRW 환율 데이터를 찾을 수 없습니다.");
  }
  return Math.round(rate);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}
