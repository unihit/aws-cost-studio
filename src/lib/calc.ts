import type {
  Category,
  CostLine,
  CostSummary,
  PricingData,
  RegionPricing,
  Resource,
  ServiceKind,
} from "../types";
import { SERVICES } from "./services";
import { formatCompact, formatNumber } from "./format";

export const HOURS_PER_MONTH = 730;

const EMPTY_KINDS = (): Record<ServiceKind, number> => ({
  ec2: 0,
  ebs: 0,
  rds: 0,
  s3: 0,
  nat: 0,
  alb: 0,
  dataTransfer: 0,
});

const EMPTY_CATEGORIES = (): Record<Category, number> => ({
  compute: 0,
  database: 0,
  storage: 0,
  network: 0,
});

export function getRegion(pricing: PricingData, regionId: string): RegionPricing {
  return pricing.regions.find((r) => r.id === regionId) ?? pricing.regions[0];
}

function io2IopsMonthly(region: RegionPricing, iops: number): number {
  const t1 = Math.min(iops, 32_000);
  const t2 = Math.min(Math.max(iops - 32_000, 0), 32_000);
  const t3 = Math.max(iops - 64_000, 0);
  const p1 = region.ebs.io2IopsTier1?.price ?? 0;
  const p2 = region.ebs.io2IopsTier2?.price ?? p1;
  const p3 = region.ebs.io2IopsTier3?.price ?? p2;
  return t1 * p1 + t2 * p2 + t3 * p3;
}

function ebsIopsMonthly(region: RegionPricing, r: Extract<Resource, { kind: "ebs" }>): number {
  switch (r.volumeType) {
    case "gp3":
      return Math.max(0, r.iops - region.ebs.freeIops) * (region.ebs.gp3Iops?.price ?? 0);
    case "io1":
      return r.iops * (region.ebs.io1Iops?.price ?? 0);
    case "io2":
      return io2IopsMonthly(region, r.iops);
    default:
      return 0;
  }
}

function ebsThroughputMonthly(
  region: RegionPricing,
  r: Extract<Resource, { kind: "ebs" }>,
): number {
  if (r.volumeType !== "gp3") return 0;
  return (
    Math.max(0, r.throughput - region.ebs.freeThroughputMBps) *
    (region.ebs.gp3ThroughputPerMBps?.price ?? 0)
  );
}

function s3StorageMonthly(
  region: RegionPricing,
  r: Extract<Resource, { kind: "s3" }>,
): number {
  if (r.storageClass === "standard") {
    const tiers = region.s3.standard.tiers;
    const caps = [50 * 1024, 500 * 1024, Number.POSITIVE_INFINITY];
    let remaining = r.storageGb;
    let previous = 0;
    let total = 0;
    for (let i = 0; i < caps.length; i++) {
      const size = Math.max(0, Math.min(remaining, caps[i] - previous));
      total += size * (tiers[i]?.price ?? 0);
      remaining -= size;
      previous = caps[i];
      if (remaining <= 0) break;
    }
    return total;
  }
  const config = region.s3[r.storageClass];
  return r.storageGb * (config.storage?.price ?? 0);
}

function dataTransferMonthly(region: RegionPricing, gb: number): number {
  const tiers = region.dataTransfer ?? [];
  const capsTb = tiers.map((t) => t.upToTb ?? Number.POSITIVE_INFINITY);
  let remainingGb = gb;
  let previousTb = 0;
  let total = 0;
  for (let i = 0; i < tiers.length; i++) {
    const capGb = capsTb[i] * 1024;
    const spanGb = Math.max(0, capGb - previousTb * 1024);
    const used = Math.min(remainingGb, spanGb);
    total += used * tiers[i].price;
    remainingGb -= used;
    previousTb = capsTb[i];
    if (remainingGb <= 0) break;
  }
  return total;
}

export function calculateResource(resource: Resource, pricing: PricingData): number {
  const region = getRegion(pricing, resource.regionId);
  switch (resource.kind) {
    case "ec2": {
      const rate = region.ec2[resource.instanceType];
      if (!rate) return 0;
      return rate.price * HOURS_PER_MONTH * resource.qty * (resource.utilization / 100);
    }
    case "ebs": {
      const key = resource.volumeType;
      const perGb =
        region.ebs[key]?.price ??
        region.ebs.gp3?.price ??
        0;
      const base = perGb * resource.sizeGb * resource.qty;
      const iops = ebsIopsMonthly(region, resource) * resource.qty;
      const throughput = ebsThroughputMonthly(region, resource) * resource.qty;
      return base + iops + throughput;
    }
    case "rds": {
      const engine = region.rds[resource.engine];
      const instance = engine.instance[resource.instanceType];
      if (!instance) return 0;
      const az = resource.multiAz ? "multi" : "single";
      const instanceCost = (resource.multiAz ? instance.multi : instance.single) * HOURS_PER_MONTH;
      const storageRate = engine.storage[resource.storageType][az]?.price ?? 0;
      let storageCost = storageRate * resource.storageGb;
      if (resource.storageType === "io1" || resource.storageType === "io2") {
        storageCost += resource.iops * (engine.storage.iops[az]?.price ?? 0);
      }
      return (instanceCost + storageCost) * resource.qty;
    }
    case "s3": {
      const config = region.s3[resource.storageClass] as {
        put?: { price: number } | null;
        get?: { price: number } | null;
        retrieval?: { price: number } | null;
      };
      const put = config.put?.price ?? region.s3.standard.put?.price ?? 0;
      const get = config.get?.price ?? region.s3.standard.get?.price ?? 0;
      const retrieval = config.retrieval?.price ?? 0;
      return (
        s3StorageMonthly(region, resource) +
        resource.putRequests * put +
        resource.getRequests * get +
        resource.retrievalGb * retrieval
      );
    }
    case "nat": {
      const hourly = region.nat.hourly?.price ?? 0;
      const perGb = region.nat.perGb?.price ?? 0;
      return resource.qty * resource.hours * hourly + resource.dataGb * perGb;
    }
    case "alb": {
      const hourly = region.alb.hourly?.price ?? 0;
      const lcu = region.alb.lcu?.price ?? 0;
      return resource.qty * resource.hours * hourly + resource.qty * resource.lcu * resource.hours * lcu;
    }
    case "dataTransfer":
      return dataTransferMonthly(region, resource.gbOut);
    default:
      return 0;
  }
}

export function resourceDetail(resource: Resource, pricing: PricingData): string {
  const region = getRegion(pricing, resource.regionId);
  switch (resource.kind) {
    case "ec2": {
      const rate = region.ec2[resource.instanceType];
      return `${resource.instanceType} · ${rate?.vcpu ?? "?"} vCPU · ${rate?.mem ?? "?"} GiB · 가동률 ${resource.utilization}%`;
    }
    case "ebs": {
      const parts = [`${resource.volumeType.toUpperCase()} · ${formatNumber(resource.sizeGb)} GB`];
      if (resource.volumeType === "gp3" || resource.volumeType === "io1" || resource.volumeType === "io2") {
        parts.push(`${formatNumber(resource.iops)} IOPS`);
      }
      if (resource.volumeType === "gp3" && resource.throughput > 125) {
        parts.push(`${resource.throughput} MB/s`);
      }
      return parts.join(" · ");
    }
    case "rds": {
      const engine = resource.engine === "postgres" ? "PostgreSQL" : "MySQL";
      return `${engine} · ${resource.instanceType} · ${resource.multiAz ? "Multi-AZ" : "Single-AZ"} · ${formatNumber(resource.storageGb)} GB ${resource.storageType}`;
    }
    case "s3": {
      const label = S3_CLASS_LABEL[resource.storageClass];
      return `${label} · ${formatNumber(resource.storageGb)} GB · 요청 ${formatCompact(resource.putRequests + resource.getRequests)}`;
    }
    case "nat":
      return `${resource.qty}개 · ${formatNumber(resource.hours)}h · ${formatNumber(resource.dataGb)} GB 처리`;
    case "alb":
      return `${resource.qty}개 · ${formatNumber(resource.hours)}h · LCU ${resource.lcu}`;
    case "dataTransfer":
      return `${formatNumber(resource.gbOut / 1024, 1)} TB /월 아웃바운드`;
    default:
      return "";
  }
}

export const S3_CLASS_LABEL: Record<Extract<Resource, { kind: "s3" }>["storageClass"], string> = {
  standard: "Standard",
  standardIA: "Standard-IA",
  onezoneIA: "One Zone-IA",
  glacierIR: "Glacier Instant",
  glacierFlexible: "Glacier Flexible",
  deepArchive: "Deep Archive",
};

export function calculateSummary(resources: Resource[], pricing: PricingData): CostSummary {
  const lines: CostLine[] = resources.map((resource) => {
    const monthlyUsd = calculateResource(resource, pricing);
    return {
      id: resource.id,
      kind: resource.kind,
      label: SERVICES[resource.kind].title,
      regionId: resource.regionId,
      monthlyUsd,
      category: SERVICES[resource.kind].category,
      detail: resourceDetail(resource, pricing),
    };
  });
  const byKind = EMPTY_KINDS();
  const byCategory = EMPTY_CATEGORIES();
  for (const line of lines) {
    byKind[line.kind] += line.monthlyUsd;
    byCategory[line.category] += line.monthlyUsd;
  }
  const monthlyUsd = lines.reduce((sum, line) => sum + line.monthlyUsd, 0);
  return { lines, monthlyUsd, annualUsd: monthlyUsd * 12, byKind, byCategory };
}

export function defaultRegion(pricing: PricingData, regionId: string): RegionPricing {
  return getRegion(pricing, regionId);
}
