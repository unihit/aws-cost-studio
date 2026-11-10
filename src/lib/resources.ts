import type { PricingData, Resource, ServiceKind } from "../types";
import { formatCompact, formatNumber } from "./format";
import { ELASTICACHE_NODES, getRegion, rdsGp3FreeBaseline, S3_CLASS_LABEL } from "./calc";
import { uid } from "./presets";

export function createDefaultResource(kind: ServiceKind, regionId: string): Resource {
  const base = { id: uid(), regionId, createdAt: Date.now() };
  switch (kind) {
    case "ec2":
      return { ...base, kind, instanceType: "t4g.medium", qty: 1, utilization: 100 };
    case "ebs":
      return {
        ...base,
        kind,
        volumeType: "gp3",
        sizeGb: 100,
        iops: 3000,
        throughput: 125,
        qty: 1,
      };
    case "rds":
      return {
        ...base,
        kind,
        engine: "postgres",
        deploymentMode: "instance",
        acu: 2,
        instanceType: "db.t4g.micro",
        multiAz: false,
        storageGb: 20,
        storageType: "gp3",
        iops: 3000,
        throughput: 125,
        qty: 1,
      };
    case "dynamodb":
      return {
        ...base,
        kind,
        capacityMode: "onDemand",
        storageGb: 50,
        writeUnits: 10,
        readUnits: 50,
        includeFreeTier: true,
      };
    case "elasticache":
      return {
        ...base,
        kind,
        engine: "valkey",
        nodeType: "cache.t4g.medium",
        qty: 1,
        replicas: 1,
        backupGb: 0,
      };
    case "s3":
      return {
        ...base,
        kind,
        storageClass: "standard",
        storageGb: 100,
        putRequests: 250_000,
        getRequests: 1_000_000,
        retrievalGb: 0,
      };
    case "lambda":
      return {
        ...base,
        kind,
        arch: "arm64",
        memoryMb: 512,
        durationMs: 120,
        invocations: 5_000_000,
        includeFreeTier: true,
        apiGatewayRequests: 5_000_000,
      };
    case "eks":
      return {
        ...base,
        kind,
        clusters: 1,
        extendedSupport: false,
        workerInstanceType: "m6g.large",
        workerQty: 2,
      };
    case "ecs":
      return {
        ...base,
        kind,
        arch: "arm64",
        launchType: "fargate",
        qty: 2,
        hours: 730,
        vcpu: 1,
        memoryGb: 2,
        ephemeralStorageGb: 20,
      };
    case "cloudfront":
      return {
        ...base,
        kind,
        gbOut: 2048,
        httpsRequests: 20_000_000,
      };
    case "nat":
      return { ...base, kind, qty: 1, hours: 730, dataGb: 100 };
    case "alb":
      return { ...base, kind, lbType: "alb", qty: 1, hours: 730, lcu: 1 };
    case "tgw":
      return { ...base, kind, qty: 3, hours: 730, dataProcessedGb: 500 };
    case "vpn":
      return { ...base, kind, qty: 1, hours: 730, accelerated: false, dataOutGb: 100 };
    case "dataTransfer":
      return { ...base, kind, gbOut: 1024 };
  }
}

export function duplicateResource(resource: Resource): Resource {
  return {
    ...resource,
    id: uid(),
    createdAt: Date.now(),
    label: resource.label ? `${resource.label} (복사)` : undefined,
  };
}

export function hasQty(resource: Resource): resource is Extract<Resource, { qty: number }> {
  return "qty" in resource;
}

export function setResourceQty(resource: Resource, qty: number): Resource {
  if (!hasQty(resource)) return resource;
  return { ...resource, qty: Math.max(1, Math.min(999, Math.round(qty))) };
}

export function migrateResourceToRegion(
  resource: Resource,
  regionId: string,
  pricing: PricingData,
): Resource {
  const region = getRegion(pricing, regionId);
  let next = { ...resource, regionId } as Resource;
  if (next.kind === "ec2" && !region.ec2[next.instanceType]) {
    next = { ...next, instanceType: Object.keys(region.ec2)[0] ?? "t4g.medium" };
  }
  if (next.kind === "rds" && !region.rds[next.engine].instance[next.instanceType]) {
    next = {
      ...next,
      instanceType: Object.keys(region.rds[next.engine].instance)[0] ?? "db.t4g.micro",
    };
  }
  if (next.kind === "eks" && !region.ec2[next.workerInstanceType]) {
    next = { ...next, workerInstanceType: Object.keys(region.ec2)[0] ?? "m6g.large" };
  }
  return next;
}

export function resourceBadges(resource: Resource, pricing: PricingData): string[] {
  const region = getRegion(pricing, resource.regionId);
  switch (resource.kind) {
    case "ec2": {
      const rate = region.ec2[resource.instanceType];
      return [
        resource.instanceType,
        rate ? `${rate.vcpu} vCPU · ${rate.mem} GiB` : "사양 정보 없음",
        `가동률 ${resource.utilization}%`,
      ];
    }
    case "ebs": {
      const badges = [
        resource.volumeType.toUpperCase(),
        `${formatNumber(resource.sizeGb)} GB`,
      ];
      if (["gp3", "io1", "io2"].includes(resource.volumeType)) {
        badges.push(`${formatNumber(resource.iops)} IOPS`);
      }
      if (resource.volumeType === "gp3" && resource.throughput > 125) {
        badges.push(`${formatNumber(resource.throughput)} MB/s`);
      }
      return badges;
    }
    case "rds": {
      if (resource.deploymentMode === "serverlessV2") {
        return [
          `Aurora Serverless v2 (${resource.engine === "postgres" ? "PG" : "MySQL"})`,
          `평균 ${resource.acu ?? 2} ACU`,
          resource.multiAz ? "Multi-AZ" : "Single-AZ",
          `${formatNumber(resource.storageGb)} GB Aurora 스토리지`,
        ];
      }
      const rate = region.rds[resource.engine].instance[resource.instanceType];
      const { freeIops, freeThroughput } = rdsGp3FreeBaseline(resource.storageGb);
      const badges = [
        resource.engine === "postgres" ? "PostgreSQL" : "MySQL",
        resource.instanceType,
        resource.multiAz ? "Multi-AZ" : "Single-AZ",
        `${formatNumber(resource.storageGb)} GB ${resource.storageType}`,
        rate ? `${rate.vcpu} vCPU · ${rate.mem} GiB` : "",
      ].filter(Boolean);
      if (
        resource.storageType === "io1" ||
        resource.storageType === "io2" ||
        (resource.storageType === "gp3" && resource.iops > freeIops)
      ) {
        badges.push(`${formatNumber(resource.iops)} IOPS`);
      }
      if (
        resource.storageType === "gp3" &&
        (resource.throughput ?? freeThroughput) > freeThroughput
      ) {
        badges.push(`${formatNumber(resource.throughput ?? freeThroughput)} MB/s`);
      }
      return badges;
    }
    case "dynamodb": {
      const modeBadge =
        resource.capacityMode === "onDemand" ? "On-Demand (50%↓)" : "Provisioned";
      const ioBadge =
        resource.capacityMode === "onDemand"
          ? `쓰기 ${resource.writeUnits}M · 읽기 ${resource.readUnits}M`
          : `${resource.writeUnits} WCU · ${resource.readUnits} RCU`;
      return [
        modeBadge,
        `${formatNumber(resource.storageGb)} GB 스토리지`,
        ioBadge,
        resource.includeFreeTier ? "25GB 무료 티어" : "무료 티어 제외",
      ];
    }
    case "elasticache": {
      const spec = ELASTICACHE_NODES[resource.nodeType];
      return [
        resource.engine === "valkey" ? "Valkey (20%↓)" : "Redis OSS",
        resource.nodeType,
        spec ? `${spec.vcpu} vCPU · ${spec.mem} GiB` : "",
        `복제본 ${resource.replicas}개`,
      ].filter(Boolean);
    }
    case "s3":
      return [
        S3_CLASS_LABEL[resource.storageClass],
        `${formatNumber(resource.storageGb)} GB`,
        `월 ${formatCompact(resource.putRequests + resource.getRequests)} 요청`,
      ];
    case "lambda":
      return [
        resource.arch === "arm64" ? "Arm64 (Graviton2)" : "x86_64",
        `${formatNumber(resource.memoryMb)} MB · ${formatNumber(resource.durationMs)} ms`,
        `호출 ${formatCompact(resource.invocations)}`,
        resource.apiGatewayRequests > 0
          ? `API GW ${formatCompact(resource.apiGatewayRequests)}`
          : "API GW 없음",
      ];
    case "eks":
      return [
        `클러스터 ${resource.clusters}개`,
        resource.extendedSupport ? "확장 버전 지원" : "표준 지원",
        `워커 ${resource.workerInstanceType} × ${resource.workerQty}`,
      ];
    case "ecs": {
      const archText = resource.arch === "arm64" ? "Arm64(Graviton)" : "x86_64";
      const spotText = resource.launchType === "fargateSpot" ? "Fargate Spot (70%↓)" : "Fargate";
      const badges = [
        spotText,
        archText,
        `${resource.vcpu} vCPU · ${resource.memoryGb} GiB`,
        `${resource.qty}개 태스크`,
      ];
      if (resource.ephemeralStorageGb > 20) {
        badges.push(`스토리지 ${resource.ephemeralStorageGb} GB`);
      }
      return badges;
    }
    case "cloudfront":
      return [
        `엣지 ${formatNumber(resource.gbOut / 1024, 2)} TB`,
        `HTTPS ${formatCompact(resource.httpsRequests)} 요청`,
        "1TB 무료 티어 반영",
      ];
    case "nat":
      return [
        `${formatNumber(resource.hours)}시간`,
        `${formatNumber(resource.dataGb)} GB 처리`,
      ];
    case "alb": {
      const isNlb = resource.lbType === "nlb";
      return [
        isNlb ? "NLB (L4 Network)" : "ALB (L7 Application)",
        `${formatNumber(resource.hours)}시간`,
        `${formatNumber(resource.lcu)} ${isNlb ? "NLCU" : "LCU"}`,
      ];
    }
    case "tgw":
      return [
        `어태치먼트 ${resource.qty}개`,
        `${formatNumber(resource.hours)}시간`,
        `데이터 처리 ${formatNumber(resource.dataProcessedGb)} GB`,
      ];
    case "vpn":
      return [
        resource.accelerated ? "가속 VPN (Global Accelerator)" : "표준 IPsec VPN",
        `연결 ${resource.qty}개 (터널 ${resource.qty * 2}개)`,
        `${formatNumber(resource.hours)}시간`,
        `아웃바운드 ${formatNumber(resource.dataOutGb)} GB`,
      ];
    case "dataTransfer":
      return [`${formatNumber(resource.gbOut / 1024, 2)} TB 아웃바운드`];
    default:
      return [];
  }
}

export function resourceIconLabel(resource: Resource): string {
  switch (resource.kind) {
    case "ec2":
      return resource.instanceType;
    case "ebs":
      return resource.volumeType.toUpperCase();
    case "rds":
      if (resource.deploymentMode === "serverlessV2") return "Aurora v2";
      return resource.engine === "postgres" ? "PostgreSQL" : "MySQL";
    case "dynamodb":
      return "DynamoDB";
    case "elasticache":
      return resource.engine === "valkey" ? "Valkey" : "Redis";
    case "s3":
      return S3_CLASS_LABEL[resource.storageClass];
    case "lambda":
      return "Lambda";
    case "eks":
      return "EKS";
    case "ecs":
      return "Fargate";
    case "cloudfront":
      return "CDN";
    case "nat":
      return "NAT";
    case "alb":
      return resource.lbType === "nlb" ? "NLB" : "ALB";
    case "tgw":
      return "TGW";
    case "vpn":
      return "S2S VPN";
    case "dataTransfer":
      return "OUT";
    default:
      return "";
  }
}
