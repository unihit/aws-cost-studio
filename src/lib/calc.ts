import type {
  Category,
  CostLine,
  CostSummary,
  PricingData,
  PurchaseOption,
  RegionPricing,
  Resource,
  ServiceKind,
  SupportPlan,
} from "../types";
import { BEDROCK_MODELS, SERVICES } from "./services";
import { formatCompact, formatNumber } from "./format";

export const HOURS_PER_MONTH = 730;

export const ELASTICACHE_NODES: Record<
  string,
  { vcpu: number; mem: number; baseRedisUsdHr: number; family: string }
> = {
  "cache.t4g.micro": { vcpu: 2, mem: 0.5, baseRedisUsdHr: 0.016, family: "Burstable (Graviton2)" },
  "cache.t4g.small": { vcpu: 2, mem: 1.37, baseRedisUsdHr: 0.032, family: "Burstable (Graviton2)" },
  "cache.t4g.medium": { vcpu: 2, mem: 3.09, baseRedisUsdHr: 0.065, family: "Burstable (Graviton2)" },
  "cache.m6g.large": { vcpu: 2, mem: 6.38, baseRedisUsdHr: 0.149, family: "General Purpose (Graviton2)" },
  "cache.m7g.large": { vcpu: 2, mem: 6.38, baseRedisUsdHr: 0.156, family: "General Purpose (Graviton3)" },
  "cache.r6g.large": { vcpu: 2, mem: 13.07, baseRedisUsdHr: 0.212, family: "Memory Optimized (Graviton2)" },
  "cache.r7g.large": { vcpu: 2, mem: 13.07, baseRedisUsdHr: 0.223, family: "Memory Optimized (Graviton3)" },
  "cache.r7g.xlarge": { vcpu: 4, mem: 26.32, baseRedisUsdHr: 0.446, family: "Memory Optimized (Graviton3)" },
  "cache.r7g.2xlarge": { vcpu: 8, mem: 52.82, baseRedisUsdHr: 0.892, family: "Memory Optimized (Graviton3)" },
};

const EMPTY_KINDS = (): Record<ServiceKind, number> => ({
  ec2: 0,
  ecs: 0,
  ebs: 0,
  rds: 0,
  dynamodb: 0,
  elasticache: 0,
  s3: 0,
  lambda: 0,
  eks: 0,
  cloudfront: 0,
  nat: 0,
  alb: 0,
  tgw: 0,
  vpn: 0,
  bedrock: 0,
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

export function getComputeMultiplier(option: PurchaseOption = "onDemand", kind: "ec2" | "rds" | "elasticache"): number {
  if (option === "onDemand") return 1;
  if (kind === "rds") {
    return option === "sp1yr" ? 0.73 : 0.54;
  }
  return option === "sp1yr" ? 0.72 : 0.52;
}

export function calculateFargateTaskHourly(
  regionId: string,
  arch: "arm64" | "x86",
  vcpu: number,
  memoryGb: number,
  launchType: "fargate" | "fargateSpot",
  purchaseOption: PurchaseOption = "onDemand",
): number {
  const factor = getRegionalFactor(regionId);
  const baseVcpu = arch === "arm64" ? 0.032384 : 0.04048;
  const baseMem = arch === "arm64" ? 0.003556 : 0.004445;
  let hourly = (vcpu * baseVcpu + memoryGb * baseMem) * factor;
  if (launchType === "fargateSpot") {
    hourly *= 0.3;
  } else {
    const mult = getComputeMultiplier(purchaseOption, "ec2");
    hourly *= mult;
  }
  return hourly;
}

export function getRegionalFactor(regionId: string): number {
  const factors: Record<string, number> = {
    "us-east-1": 1.0,
    "us-west-2": 1.0,
    "eu-west-1": 1.08,
    "eu-central-1": 1.14,
    "ap-northeast-2": 1.16,
    "ap-northeast-1": 1.18,
    "ap-southeast-1": 1.16,
    "ap-southeast-2": 1.18,
  };
  return factors[regionId] ?? 1.12;
}

export function getTgwAttachmentHourly(regionId: string): number {
  if (regionId === "us-east-1" || regionId === "us-west-2") return 0.05;
  if (regionId === "ap-northeast-2" || regionId === "ap-northeast-1") return 0.07;
  return 0.06;
}

export function getElastiCacheHourlyRate(
  regionId: string,
  nodeType: string,
  engine: "valkey" | "redis",
): number {
  const spec = ELASTICACHE_NODES[nodeType] ?? ELASTICACHE_NODES["cache.t4g.micro"];
  const redisHourly = spec.baseRedisUsdHr * getRegionalFactor(regionId);
  // AWS prices Valkey 20% lower than Redis on node-hours
  return engine === "valkey" ? redisHourly * 0.8 : redisHourly;
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

export function rdsGp3FreeBaseline(storageGb: number): { freeIops: number; freeThroughput: number } {
  // AWS RDS gp3: volumes >= 400 GiB include 12,000 IOPS and 500 MiB/s baseline
  if (storageGb >= 400) {
    return { freeIops: 12_000, freeThroughput: 500 };
  }
  return { freeIops: 3_000, freeThroughput: 125 };
}

export function calculateResource(
  resource: Resource,
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
): number {
  const region = getRegion(pricing, resource.regionId);
  switch (resource.kind) {
    case "ec2": {
      const rate = region.ec2[resource.instanceType];
      if (!rate) return 0;
      const mult = getComputeMultiplier(purchaseOption, "ec2");
      return rate.price * mult * HOURS_PER_MONTH * resource.qty * (resource.utilization / 100);
    }
    case "ebs": {
      const key = resource.volumeType;
      const perGb = region.ebs[key]?.price ?? region.ebs.gp3?.price ?? 0;
      const base = perGb * resource.sizeGb * resource.qty;
      const iops = ebsIopsMonthly(region, resource) * resource.qty;
      const throughput = ebsThroughputMonthly(region, resource) * resource.qty;
      return base + iops + throughput;
    }
    case "rds": {
      if (resource.deploymentMode === "serverlessV2") {
        const factor = getRegionalFactor(resource.regionId);
        const acuHourly = 0.12 * factor;
        const acu = resource.acu ?? 2;
        const instanceCost = acu * acuHourly * HOURS_PER_MONTH * (resource.multiAz ? 2 : 1);
        const auroraStorageCost = resource.storageGb * 0.1 * factor;
        return (instanceCost + auroraStorageCost) * resource.qty;
      }
      const engine = region.rds[resource.engine];
      const instance = engine.instance[resource.instanceType];
      if (!instance) return 0;
      const az = resource.multiAz ? "multi" : "single";
      const mult = getComputeMultiplier(purchaseOption, "rds");
      const instanceCost =
        (resource.multiAz ? instance.multi : instance.single) * mult * HOURS_PER_MONTH;
      const storageRate = engine.storage[resource.storageType][az]?.price ?? 0;
      let storageCost = storageRate * resource.storageGb;
      if (resource.storageType === "io1" || resource.storageType === "io2") {
        storageCost += resource.iops * (engine.storage.iops[az]?.price ?? 0);
      } else if (resource.storageType === "gp3") {
        const { freeIops, freeThroughput } = rdsGp3FreeBaseline(resource.storageGb);
        const extraIops = Math.max(0, resource.iops - freeIops);
        const extraThroughput = Math.max(0, (resource.throughput ?? freeThroughput) - freeThroughput);
        const gp3IopsRate = engine.storage.gp3Iops?.[az]?.price ?? 0.02;
        const throughputRate = engine.storage.throughput?.[az]?.price ?? 0.08;
        storageCost += extraIops * gp3IopsRate + extraThroughput * throughputRate;
      }
      return (instanceCost + storageCost) * resource.qty;
    }
    case "dynamodb": {
      const factor = getRegionalFactor(resource.regionId);
      const freeStorageGb = resource.includeFreeTier ? 25 : 0;
      const billableStorageGb = Math.max(0, resource.storageGb - freeStorageGb);
      const storageCost = billableStorageGb * 0.25 * factor;

      if (resource.capacityMode === "onDemand") {
        // AWS 50% reduced On-Demand DynamoDB pricing: $0.625 per 1M WRU, $0.125 per 1M RRU (base us-east-1)
        const writeCost = resource.writeUnits * 0.625 * factor;
        const readCost = resource.readUnits * 0.125 * factor;
        return storageCost + writeCost + readCost;
      }
      const freeUnits = resource.includeFreeTier ? 25 : 0;
      const billableWcu = Math.max(0, resource.writeUnits - freeUnits);
      const billableRcu = Math.max(0, resource.readUnits - freeUnits);
      const writeCost = billableWcu * 0.00065 * factor * HOURS_PER_MONTH;
      const readCost = billableRcu * 0.00013 * factor * HOURS_PER_MONTH;
      return storageCost + writeCost + readCost;
    }
    case "elasticache": {
      const hourly = getElastiCacheHourlyRate(resource.regionId, resource.nodeType, resource.engine);
      const mult = getComputeMultiplier(purchaseOption, "elasticache");
      const totalNodes = resource.qty * (1 + resource.replicas);
      const nodeMonthly = hourly * mult * HOURS_PER_MONTH * totalNodes;
      const backupMonthly = resource.backupGb * 0.085;
      return nodeMonthly + backupMonthly;
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
    case "lambda": {
      const freeRequests = resource.includeFreeTier ? 1_000_000 : 0;
      const freeGbSeconds = resource.includeFreeTier ? 400_000 : 0;
      const billableRequests = Math.max(0, resource.invocations - freeRequests);
      const requestCost = (billableRequests / 1_000_000) * 0.2;

      const totalGbSeconds =
        resource.invocations * (resource.durationMs / 1000) * (resource.memoryMb / 1024);
      const billableGbSeconds = Math.max(0, totalGbSeconds - freeGbSeconds);
      const gbSecondRate = resource.arch === "arm64" ? 0.0000133334 : 0.0000166667;
      const computeCost = billableGbSeconds * gbSecondRate;

      const apiGwRatePerMillion = 1.0 * getRegionalFactor(resource.regionId);
      const apiGwCost = (resource.apiGatewayRequests / 1_000_000) * apiGwRatePerMillion;
      return requestCost + computeCost + apiGwCost;
    }
    case "ecs": {
      const taskHourly = calculateFargateTaskHourly(
        resource.regionId,
        resource.arch,
        resource.vcpu,
        resource.memoryGb,
        resource.launchType,
        purchaseOption,
      );
      const computeCost = taskHourly * resource.hours * resource.qty;
      const extraStorageGb = Math.max(0, resource.ephemeralStorageGb - 20);
      const factor = getRegionalFactor(resource.regionId);
      const storageCost =
        extraStorageGb * 0.08 * factor * (resource.hours / HOURS_PER_MONTH) * resource.qty;
      return computeCost + storageCost;
    }
    case "eks": {
      const controlPlaneRate = resource.extendedSupport ? 0.6 : 0.1;
      const controlPlaneCost = resource.clusters * controlPlaneRate * HOURS_PER_MONTH;
      const workerRate =
        region.ec2[resource.workerInstanceType]?.price ??
        region.ec2["m6i.large"]?.price ??
        0.096;
      const mult = getComputeMultiplier(purchaseOption, "ec2");
      const workerCost = workerRate * mult * HOURS_PER_MONTH * resource.workerQty;
      return controlPlaneCost + workerCost;
    }
    case "cloudfront": {
      // CloudFront includes 1 TB/month free data transfer out & 10M HTTPS requests free
      const billableGb = Math.max(0, resource.gbOut - 1024);
      const isApac = resource.regionId.startsWith("ap-");
      const perGbRate = isApac ? 0.085 : 0.085 * 0.92;
      const billableRequests = Math.max(0, resource.httpsRequests - 10_000_000);
      const reqRatePer10k = isApac ? 0.012 : 0.01;
      return billableGb * perGbRate + (billableRequests / 10_000) * reqRatePer10k;
    }
    case "nat": {
      const hourly = region.nat.hourly?.price ?? 0;
      const perGb = region.nat.perGb?.price ?? 0;
      return resource.qty * resource.hours * hourly + resource.dataGb * perGb;
    }
    case "alb": {
      const hourly = region.alb.hourly?.price ?? 0;
      const isNlb = resource.lbType === "nlb";
      const cuRate = isNlb
        ? (region.alb.lcu?.price ?? 0.008) * 0.75
        : (region.alb.lcu?.price ?? 0.008);
      return (
        resource.qty * resource.hours * hourly +
        resource.qty * resource.lcu * resource.hours * cuRate
      );
    }
    case "tgw": {
      const attachmentHourly = getTgwAttachmentHourly(resource.regionId);
      const attachmentCost = resource.qty * resource.hours * attachmentHourly;
      const dataCost = resource.dataProcessedGb * 0.02;
      return attachmentCost + dataCost;
    }
    case "vpn": {
      const connHourly = resource.accelerated ? 0.1 : 0.05;
      const connCost = resource.qty * resource.hours * connHourly;
      const dtoCost = dataTransferMonthly(region, resource.dataOutGb);
      return connCost + dtoCost;
    }
    case "bedrock": {
      const model = BEDROCK_MODELS[resource.modelId] ?? BEDROCK_MODELS["anthropic.claude-3-7-sonnet"];
      const factor = getRegionalFactor(resource.regionId);
      const inputCost = resource.monthlyInputTokensM * model.inputPerMillionUsd * factor;
      const outputCost = resource.monthlyOutputTokensM * model.outputPerMillionUsd * factor;
      return inputCost + outputCost;
    }
    case "dataTransfer":
      return dataTransferMonthly(region, resource.gbOut);
    default:
      return 0;
  }
}

export function getGravitonEquivalent(instanceType: string, region: RegionPricing): string | null {
  const [family, size] = instanceType.split(".");
  if (!family || !size) return null;
  const map: Record<string, string[]> = {
    t3: ["t4g"],
    m6i: ["m7g", "m6g"],
    c6i: ["c7g", "c6g"],
    r6i: ["r7g", "r6g"],
  };
  const candidates = map[family];
  if (!candidates) return null;
  for (const targetFamily of candidates) {
    const candidate = `${targetFamily}.${size}`;
    if (region.ec2[candidate]) return candidate;
  }
  return null;
}

export function getRdsGravitonEquivalent(
  instanceType: string,
  engine: "postgres" | "mysql",
  region: RegionPricing,
): string | null {
  const parts = instanceType.split(".");
  if (parts.length !== 3) return null;
  const [, family, size] = parts;
  const map: Record<string, string[]> = {
    t3: ["t4g"],
    m6i: ["m7g", "m6g"],
    r6i: ["r7g", "r6g"],
  };
  const candidates = map[family];
  if (!candidates) return null;
  const bucket = region.rds[engine].instance;
  for (const targetFamily of candidates) {
    const candidate = `db.${targetFamily}.${size}`;
    if (bucket[candidate]) return candidate;
  }
  return null;
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
      if (resource.deploymentMode === "serverlessV2") {
        return `Aurora Serverless v2 (${engine}) · 평균 ${resource.acu ?? 2} ACU · ${resource.multiAz ? "Multi-AZ" : "Single-AZ"} · ${formatNumber(resource.storageGb)} GB`;
      }
      const { freeIops, freeThroughput } = rdsGp3FreeBaseline(resource.storageGb);
      const parts = [
        engine,
        resource.instanceType,
        resource.multiAz ? "Multi-AZ" : "Single-AZ",
        `${formatNumber(resource.storageGb)} GB ${resource.storageType}`,
      ];
      if (
        (resource.storageType === "io1" || resource.storageType === "io2") ||
        (resource.storageType === "gp3" && resource.iops > freeIops)
      ) {
        parts.push(`${formatNumber(resource.iops)} IOPS`);
      }
      if (resource.storageType === "gp3" && (resource.throughput ?? freeThroughput) > freeThroughput) {
        parts.push(`${resource.throughput} MB/s`);
      }
      return parts.join(" · ");
    }
    case "dynamodb": {
      const modeLabel = resource.capacityMode === "onDemand" ? "On-Demand" : "Provisioned";
      const unitLabel =
        resource.capacityMode === "onDemand"
          ? `쓰기 ${resource.writeUnits}M · 읽기 ${resource.readUnits}M/월`
          : `${resource.writeUnits} WCU · ${resource.readUnits} RCU`;
      return `${modeLabel} · ${formatNumber(resource.storageGb)} GB · ${unitLabel}`;
    }
    case "elasticache": {
      const engineLabel = resource.engine === "valkey" ? "Valkey" : "Redis";
      return `${engineLabel} · ${resource.nodeType} · ${resource.qty}샤드 × 복제본 ${resource.replicas}`;
    }
    case "s3": {
      const label = S3_CLASS_LABEL[resource.storageClass];
      return `${label} · ${formatNumber(resource.storageGb)} GB · 요청 ${formatCompact(resource.putRequests + resource.getRequests)}`;
    }
    case "lambda": {
      const archLabel = resource.arch === "arm64" ? "Arm64" : "x86_64";
      return `${archLabel} · ${resource.memoryMb}MB · ${resource.durationMs}ms · 호출 ${formatCompact(resource.invocations)}/월`;
    }
    case "eks":
      return `클러스터 ${resource.clusters}개${resource.extendedSupport ? "(확장 지원)" : ""} · 워커 ${resource.workerInstanceType} × ${resource.workerQty}`;
    case "ecs": {
      const archLabel = resource.arch === "arm64" ? "Arm64(Graviton)" : "x86_64";
      const spotLabel = resource.launchType === "fargateSpot" ? "Fargate Spot" : "Fargate";
      const parts = [
        spotLabel,
        archLabel,
        `${resource.vcpu} vCPU · ${resource.memoryGb} GiB`,
        `태스크 ${resource.qty}개`,
      ];
      if (resource.ephemeralStorageGb > 20) {
        parts.push(`스토리지 ${resource.ephemeralStorageGb} GB`);
      }
      return parts.join(" · ");
    }
    case "cloudfront":
      return `엣지 전송 ${formatNumber(resource.gbOut / 1024, 2)} TB · HTTPS ${formatCompact(resource.httpsRequests)}`;
    case "nat":
      return `${resource.qty}개 · ${formatNumber(resource.hours)}h · ${formatNumber(resource.dataGb)} GB 처리`;
    case "alb": {
      const isNlb = resource.lbType === "nlb";
      const typeLabel = isNlb ? "Network (NLB)" : "Application (ALB)";
      const cuLabel = isNlb ? "NLCU" : "LCU";
      return `${typeLabel} · ${resource.qty}개 · ${formatNumber(resource.hours)}h · ${cuLabel} ${resource.lcu}`;
    }
    case "tgw":
      return `어태치먼트 ${resource.qty}개 · ${formatNumber(resource.hours)}h · 처리 ${formatNumber(resource.dataProcessedGb)} GB`;
    case "vpn":
      return `${resource.accelerated ? "가속 VPN" : "표준 IPsec"} · 연결 ${resource.qty}개(터널 ${resource.qty * 2}개) · ${formatNumber(resource.hours)}h · 송신 ${formatNumber(resource.dataOutGb)} GB`;
    case "bedrock": {
      const model = BEDROCK_MODELS[resource.modelId] ?? BEDROCK_MODELS["anthropic.claude-3-7-sonnet"];
      return `${model.name} · 입력 ${formatNumber(resource.monthlyInputTokensM, 1)}M · 출력 ${formatNumber(resource.monthlyOutputTokensM, 1)}M 토큰`;
    }
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

export function calculateSupportFee(subtotalUsd: number, supportPlan: SupportPlan = "basic"): number {
  if (subtotalUsd <= 0 || supportPlan === "basic") return 0;
  if (supportPlan === "developer") {
    return Math.max(29, subtotalUsd * 0.03);
  }
  // AWS Business Support tiered schedule: 10% first $10K, 7% $10K-$80K, 5% $80K-$250K, 3% >$250K (min $100)
  let fee = 0;
  const tier1 = Math.min(subtotalUsd, 10_000);
  const tier2 = Math.min(Math.max(0, subtotalUsd - 10_000), 70_000);
  const tier3 = Math.min(Math.max(0, subtotalUsd - 80_000), 170_000);
  const tier4 = Math.max(0, subtotalUsd - 250_000);
  fee = tier1 * 0.1 + tier2 * 0.07 + tier3 * 0.05 + tier4 * 0.03;
  return Math.max(100, fee);
}

export function calculateSummary(
  resources: Resource[],
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
  supportPlan: SupportPlan = "basic",
  includeVat = false,
): CostSummary {
  const lines: CostLine[] = resources.map((resource) => {
    const monthlyUsd = calculateResource(resource, pricing, purchaseOption);
    return {
      id: resource.id,
      kind: resource.kind,
      label: SERVICES[resource.kind].title,
      customLabel: resource.label,
      env: resource.env,
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
  const subtotalUsd = lines.reduce((sum, line) => sum + line.monthlyUsd, 0);
  const supportUsd = calculateSupportFee(subtotalUsd, supportPlan);
  const vatUsd = includeVat ? (subtotalUsd + supportUsd) * 0.1 : 0;
  const monthlyUsd = subtotalUsd + supportUsd + vatUsd;

  const rawOnDemandUsd = resources.reduce(
    (sum, resource) => sum + calculateResource(resource, pricing, "onDemand"),
    0,
  );
  const onDemandSupportUsd = calculateSupportFee(rawOnDemandUsd, supportPlan);
  const onDemandVatUsd = includeVat ? (rawOnDemandUsd + onDemandSupportUsd) * 0.1 : 0;
  const onDemandMonthlyUsd = rawOnDemandUsd + onDemandSupportUsd + onDemandVatUsd;

  return {
    lines,
    subtotalUsd,
    supportUsd,
    vatUsd,
    monthlyUsd,
    annualUsd: monthlyUsd * 12,
    onDemandMonthlyUsd,
    byKind,
    byCategory,
  };
}

export function defaultRegion(pricing: PricingData, regionId: string): RegionPricing {
  return getRegion(pricing, regionId);
}
