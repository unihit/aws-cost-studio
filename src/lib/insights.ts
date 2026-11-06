import type { PricingData, PurchaseOption, Resource } from "../types";
import {
  calculateResource,
  getGravitonEquivalent,
  getRdsGravitonEquivalent,
  getRegion,
} from "./calc";

export type InsightTone = "amber" | "emerald" | "indigo";

export type InsightAction =
  | { type: "migrateGraviton" }
  | { type: "switchPurchaseOption"; option: PurchaseOption }
  | { type: "switchValkey" }
  | { type: "switchLambdaArm" }
  | { type: "switchEcsArm" }
  | { type: "switchEcsSpot" };

export interface Insight {
  id: string;
  title: string;
  body: string;
  savingsUsd: number;
  tone: InsightTone;
  actionLabel?: string;
  action?: InsightAction;
}

const sum = (
  resources: Resource[],
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
): number =>
  resources.reduce(
    (total, resource) => total + calculateResource(resource, pricing, purchaseOption),
    0,
  );

export function applyGravitonMigration(
  resources: Resource[],
  pricing: PricingData,
): { next: Resource[]; count: number } {
  let count = 0;
  const next = resources.map((resource): Resource => {
    const region = getRegion(pricing, resource.regionId);
    if (resource.kind === "ec2") {
      const target = getGravitonEquivalent(resource.instanceType, region);
      if (target && target !== resource.instanceType) {
        count++;
        return { ...resource, instanceType: target };
      }
    } else if (resource.kind === "rds") {
      const target = getRdsGravitonEquivalent(resource.instanceType, resource.engine, region);
      if (target && target !== resource.instanceType) {
        count++;
        return { ...resource, instanceType: target };
      }
    } else if (resource.kind === "eks") {
      const target = getGravitonEquivalent(resource.workerInstanceType, region);
      if (target && target !== resource.workerInstanceType) {
        count++;
        return { ...resource, workerInstanceType: target };
      }
    } else if (resource.kind === "ecs" && resource.arch === "x86") {
      count++;
      return { ...resource, arch: "arm64" };
    }
    return resource;
  });
  return { next, count };
}

export function buildInsights(
  resources: Resource[],
  pricing: PricingData,
  purchaseOption: PurchaseOption = "onDemand",
): Insight[] {
  const insights: Insight[] = [];

  // 1. Real Graviton migration comparison (EC2 + RDS + EKS workers)
  const gravitonPreview = applyGravitonMigration(resources, pricing);
  if (gravitonPreview.count > 0) {
    const currentCost = sum(resources, pricing, purchaseOption);
    const migratedCost = sum(gravitonPreview.next, pricing, purchaseOption);
    const diff = currentCost - migratedCost;
    if (diff > 0.5) {
      insights.push({
        id: "graviton-migration",
        title: `Graviton(Arm) 전환 가능 리소스 ${gravitonPreview.count}건 발견`,
        body: "x86 인스턴스(m6i·c6i·r6i·t3)를 동급 Graviton(m7g·m6g·c7g·r7g·t4g) 실측 요율로 전환하면 성능을 높이면서 즉시 절감됩니다.",
        savingsUsd: diff,
        tone: "emerald",
        actionLabel: "원클릭 Graviton 전환",
        action: { type: "migrateGraviton" },
      });
    }
  }

  // 2. Savings Plans / RI comparison when currently on On-Demand
  if (purchaseOption === "onDemand") {
    const onDemandTotal = sum(resources, pricing, "onDemand");
    const sp1yrTotal = sum(resources, pricing, "sp1yr");
    const spSavings = onDemandTotal - sp1yrTotal;
    if (spSavings > 1) {
      insights.push({
        id: "compute-sp-1yr",
        title: "1년 약정(Savings Plans · RI) 전환 시 고정비 절감",
        body: "상시 가동되는 EC2 · RDS · ElastiCache · EKS 워커에 1년 No-Upfront 약정을 적용했을 때의 실측 절감액입니다.",
        savingsUsd: spSavings,
        tone: "indigo",
        actionLabel: "1년 약정 요율 적용",
        action: { type: "switchPurchaseOption", option: "sp1yr" },
      });
    }
  }

  // 3. ElastiCache Redis -> Valkey (20% cheaper)
  const redisResources = resources.filter(
    (r): r is Extract<Resource, { kind: "elasticache" }> =>
      r.kind === "elasticache" && r.engine === "redis",
  );
  if (redisResources.length > 0) {
    const redisCost = sum(redisResources, pricing, purchaseOption);
    const valkeyCost = sum(
      redisResources.map((r) => ({ ...r, engine: "valkey" as const })),
      pricing,
      purchaseOption,
    );
    const diff = redisCost - valkeyCost;
    if (diff > 0) {
      insights.push({
        id: "elasticache-valkey",
        title: "ElastiCache Redis를 Valkey 엔진으로 전환 (20% 할인)",
        body: "AWS는 Redis 호환 오픈소스 Valkey 엔진에 노드 시간당 20% 낮은 요율을 적용합니다.",
        savingsUsd: diff,
        tone: "emerald",
        actionLabel: "Valkey로 전환",
        action: { type: "switchValkey" },
      });
    }
  }

  // 4. Lambda x86 -> Arm64
  const x86Lambda = resources.filter(
    (r): r is Extract<Resource, { kind: "lambda" }> => r.kind === "lambda" && r.arch === "x86",
  );
  if (x86Lambda.length > 0) {
    const currentLambdaCost = sum(x86Lambda, pricing, purchaseOption);
    const armLambdaCost = sum(
      x86Lambda.map((r) => ({ ...r, arch: "arm64" as const })),
      pricing,
      purchaseOption,
    );
    const diff = currentLambdaCost - armLambdaCost;
    if (diff > 0.1) {
      insights.push({
        id: "lambda-arm64",
        title: "AWS Lambda Arm64(Graviton2) 아키텍처 전환",
        body: "Lambda 함수를 Arm64로 빌드하면 GB-초당 실행 단가가 20% 저렴해집니다.",
        savingsUsd: diff,
        tone: "emerald",
        actionLabel: "Arm64로 전환",
        action: { type: "switchLambdaArm" },
      });
    }
  }

  // 5. ECS Fargate x86 -> Arm64 (20% savings)
  const x86Ecs = resources.filter(
    (r): r is Extract<Resource, { kind: "ecs" }> => r.kind === "ecs" && r.arch === "x86",
  );
  if (x86Ecs.length > 0) {
    const currentCost = sum(x86Ecs, pricing, purchaseOption);
    const armCost = sum(
      x86Ecs.map((r) => ({ ...r, arch: "arm64" as const })),
      pricing,
      purchaseOption,
    );
    const diff = currentCost - armCost;
    if (diff > 0.1) {
      insights.push({
        id: "ecs-fargate-arm64",
        title: "ECS Fargate Arm64(Graviton) 전환 시 20% 절감",
        body: "Fargate 태스크를 Arm64 기반 컨테이너 이미지로 빌드하면 vCPU와 메모리 단가가 즉시 20% 할인됩니다.",
        savingsUsd: diff,
        tone: "emerald",
        actionLabel: "Fargate Arm64로 전환",
        action: { type: "switchEcsArm" },
      });
    }
  }

  // 6. ECS Fargate Spot on dev/stage
  const standardEcsDev = resources.filter(
    (r): r is Extract<Resource, { kind: "ecs" }> =>
      r.kind === "ecs" && r.launchType === "fargate" && (r.env === "dev" || r.env === "stage"),
  );
  if (standardEcsDev.length > 0) {
    const currentCost = sum(standardEcsDev, pricing, purchaseOption);
    const spotCost = sum(
      standardEcsDev.map((r) => ({ ...r, launchType: "fargateSpot" as const })),
      pricing,
      purchaseOption,
    );
    const diff = currentCost - spotCost;
    if (diff > 0.5) {
      insights.push({
        id: "ecs-fargate-spot",
        title: `${standardEcsDev.length}개 비프로덕션 ECS 태스크 Fargate Spot 전환`,
        body: "개발·스테이징 환경이나 중단 가능한 배치 작업에 Fargate Spot을 적용하면 최대 70%까지 절감할 수 있습니다.",
        savingsUsd: diff,
        tone: "indigo",
        actionLabel: "Fargate Spot 적용",
        action: { type: "switchEcsSpot" },
      });
    }
  }

  // 5. Low utilization EC2
  const ec2 = resources.filter((r) => r.kind === "ec2");
  const idleEc2 = ec2.filter((r) => r.utilization <= 40);
  if (idleEc2.length > 0) {
    const idleCost = sum(idleEc2, pricing, purchaseOption);
    insights.push({
      id: "ec2-low-utilization",
      title: `${idleEc2.length}개 인스턴스의 가동률이 40% 이하입니다`,
      body: "한 단계 낮은 인스턴스로 다운사이즈하거나 EventBridge 스케줄러/Spot 인스턴스를 활용하면 유휴 비용을 줄일 수 있습니다.",
      savingsUsd: idleCost * 0.3,
      tone: "amber",
    });
  }

  // 6. S3 Lifecycle policy
  for (const resource of resources) {
    if (resource.kind !== "s3" || resource.storageClass !== "standard") continue;
    const region = getRegion(pricing, resource.regionId);
    const standard = region.s3.standard.tiers[0]?.price ?? 0;
    const infrequent = region.s3.standardIA.storage?.price ?? 0;
    if (resource.storageGb > 1024 && standard > infrequent) {
      insights.push({
        id: `s3-lifecycle-${resource.id}`,
        title: "S3 수명 주기 정책으로 스토리지 비용 절감",
        body: "30일 이상 액세스하지 않는 객체를 Standard-IA로 전환하면 GB당 요율이 크게 낮아집니다.",
        savingsUsd: resource.storageGb * 0.5 * (standard - infrequent),
        tone: "emerald",
      });
    }
  }

  // 7. NAT Gateway VPC Endpoint
  const natDataGb = resources.reduce(
    (total, r) => total + (r.kind === "nat" ? r.dataGb : 0),
    0,
  );
  if (natDataGb > 1000) {
    insights.push({
      id: "nat-endpoint",
      title: "S3 · DynamoDB Gateway 엔드포인트 활용",
      body: "NAT Gateway를 거치는 내부 AWS 트래픽을 무료 Gateway VPC 엔드포인트로 우회하면 GB당 처리 요금을 아낄 수 있습니다.",
      savingsUsd:
        natDataGb *
        0.4 *
        (getRegion(pricing, resources[0]?.regionId ?? "ap-northeast-2").nat.perGb?.price ?? 0),
      tone: "emerald",
    });
  }

  // 8. Data transfer out -> CloudFront
  const transferCost = sum(
    resources.filter((r) => r.kind === "dataTransfer"),
    pricing,
    purchaseOption,
  );
  if (transferCost > 0) {
    insights.push({
      id: "cloudfront",
      title: "CloudFront 엣지 캐싱 · 1TB 무료 티어 활용",
      body: "오리진 직접 아웃바운드 대신 CloudFront를 앞단에 두면 월 1TB 무료 전송과 더 낮은 엣지 단가를 적용받을 수 있습니다.",
      savingsUsd: transferCost * 0.22,
      tone: "amber",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "start",
      title: "리소스를 추가하면 절감 기회를 찾아드립니다",
      body: "Graviton 전환, 약정 할인, S3 수명 주기, NAT 트래픽을 분석해 월별 절감 가능액을 자동으로 계산합니다.",
      savingsUsd: 0,
      tone: "emerald",
    });
  }

  return insights.sort((a, b) => b.savingsUsd - a.savingsUsd).slice(0, 4);
}

export function totalPotentialSavings(insights: Insight[]): number {
  return insights.reduce((total, insight) => total + insight.savingsUsd, 0);
}
