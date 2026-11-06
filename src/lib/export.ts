import type {
  CostSummary,
  Currency,
  EnvTag,
  PricingData,
  PurchaseOption,
  Resource,
  ServiceKind,
} from "../types";
import { ENV_META, PURCHASE_OPTIONS, SERVICES } from "./services";
import { formatMoney, formatUsd } from "./format";
import { getRegion, resourceDetail } from "./calc";

const VALID_KINDS: ServiceKind[] = [
  "ec2",
  "ebs",
  "rds",
  "elasticache",
  "s3",
  "lambda",
  "eks",
  "ecs",
  "cloudfront",
  "nat",
  "alb",
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
): string {
  const now = new Date().toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" });
  const purchaseMeta =
    PURCHASE_OPTIONS.find((item) => item.value === purchaseOption) ?? PURCHASE_OPTIONS[0];
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
    `> 요금 모델: ${purchaseMeta.label}`,
    `> 통화: ${currency} · 참고 환율: 1 USD = ${fx.toLocaleString("ko-KR")} KRW`,
    `> 산출 기준: 월 730시간 · AWS Pricing Calculator 실측 요율`,
    "",
    "## 월간 요약",
    "",
    `- **월 예상 비용: ${formatMoney(summary.monthlyUsd, currency, fx)}**`,
    `- 연 예상 비용: ${formatMoney(summary.annualUsd, currency, fx)}`,
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
        const pct = summary.monthlyUsd ? ((value / summary.monthlyUsd) * 100).toFixed(1) : "0.0";
        return `- ${label}: ${formatUsd(value)} (${pct}%)`;
      }),
    "",
    "---",
    "AWS Cost Studio · calculator.aws 공개 요율 기반 · 실제 청구서와 차이가 있을 수 있습니다.",
  ].join("\n");
}

export function downloadJson(
  resources: Resource[],
  currency: Currency,
  fx: number,
  summary: CostSummary,
  purchaseOption: PurchaseOption = "onDemand",
): void {
  const payload = {
    app: "aws-cost-studio",
    version: 2,
    exportedAt: new Date().toISOString(),
    currency,
    fxKrwPerUsd: fx,
    purchaseOption,
    summary: {
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
}

export function encodeShareUrl(state: SharedState): string {
  const payload = JSON.stringify({
    r: state.resources,
    c: state.currency,
    f: state.fx,
    p: state.purchaseOption,
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
