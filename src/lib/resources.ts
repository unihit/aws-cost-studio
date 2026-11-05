import type { PricingData, Resource, ServiceKind } from "../types";
import { formatCompact, formatNumber } from "./format";
import { getRegion, S3_CLASS_LABEL } from "./calc";
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
        instanceType: "db.t4g.micro",
        multiAz: false,
        storageGb: 20,
        storageType: "gp3",
        iops: 3000,
        qty: 1,
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
    case "nat":
      return { ...base, kind, qty: 1, hours: 730, dataGb: 100 };
    case "alb":
      return { ...base, kind, qty: 1, hours: 730, lcu: 1 };
    case "dataTransfer":
      return { ...base, kind, gbOut: 1024 };
  }
}

export function duplicateResource(resource: Resource): Resource {
  return { ...resource, id: uid(), createdAt: Date.now() };
}

export function hasQty(resource: Resource): resource is Extract<Resource, { qty: number }> {
  return "qty" in resource;
}

export function setResourceQty(resource: Resource, qty: number): Resource {
  if (!hasQty(resource)) return resource;
  return { ...resource, qty: Math.max(1, Math.min(999, Math.round(qty))) };
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
      const rate = region.rds[resource.engine].instance[resource.instanceType];
      return [
        resource.engine === "postgres" ? "PostgreSQL" : "MySQL",
        resource.instanceType,
        resource.multiAz ? "Multi-AZ" : "Single-AZ",
        `${formatNumber(resource.storageGb)} GB ${resource.storageType}`,
        rate ? `${rate.vcpu} vCPU · ${rate.mem} GiB` : "",
      ].filter(Boolean);
    }
    case "s3":
      return [
        S3_CLASS_LABEL[resource.storageClass],
        `${formatNumber(resource.storageGb)} GB`,
        `월 ${formatCompact(resource.putRequests + resource.getRequests)} 요청`,
      ];
    case "nat":
      return [
        `${formatNumber(resource.hours)}시간`,
        `${formatNumber(resource.dataGb)} GB 처리`,
      ];
    case "alb":
      return [`${formatNumber(resource.hours)}시간`, `${formatNumber(resource.lcu)} LCU`];
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
      return resource.engine === "postgres" ? "PostgreSQL" : "MySQL";
    case "s3":
      return S3_CLASS_LABEL[resource.storageClass];
    case "nat":
      return "NAT";
    case "alb":
      return "ALB";
    case "dataTransfer":
      return "OUT";
    default:
      return "";
  }
}
