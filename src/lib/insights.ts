import type { PricingData, Resource } from "../types";
import { calculateResource, getRegion } from "./calc";

export type InsightTone = "amber" | "emerald" | "indigo";

export interface Insight {
  id: string;
  title: string;
  body: string;
  savingsUsd: number;
  tone: InsightTone;
}

const sum = (resources: Resource[], pricing: PricingData): number =>
  resources.reduce((total, resource) => total + calculateResource(resource, pricing), 0);

export function buildInsights(resources: Resource[], pricing: PricingData): Insight[] {
  const insights: Insight[] = [];

  const ec2 = resources.filter((r) => r.kind === "ec2");
  const ec2Cost = sum(ec2, pricing);
  if (ec2Cost > 0) {
    insights.push({
      id: "ec2-savings-plan",
      title: "Savings Plans로 컴퓨트 고정비 절감",
      body: "24/7로 유지되는 EC2가 있다면 1년 Compute Savings Plans로 최대 20%를 아낄 수 있습니다.",
      savingsUsd: ec2Cost * 0.2,
      tone: "indigo",
    });
  }

  const idleEc2 = ec2.filter((r) => r.utilization <= 40);
  if (idleEc2.length > 0) {
    const idleCost = sum(idleEc2, pricing);
    insights.push({
      id: "ec2-low-utilization",
      title: `${idleEc2.length}개 인스턴스의 가동률이 40% 이하입니다`,
      body: "한 단계 낮은 인스턴스로 다운사이즈하거나 업무 시간에만 스케줄링하면 유휴 비용을 줄일 수 있습니다.",
      savingsUsd: idleCost * 0.3,
      tone: "amber",
    });
  }

  const rdsCost = sum(
    resources.filter((r) => r.kind === "rds"),
    pricing,
  );
  if (rdsCost > 0) {
    insights.push({
      id: "rds-reserved",
      title: "RDS 예약 인스턴스 검토",
      body: "상시 운영 데이터베이스는 1년 예약 인스턴스로 전환할 때 온디맨드 대비 약 25% 절감이 가능합니다.",
      savingsUsd: rdsCost * 0.25,
      tone: "indigo",
    });
  }

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

  const natDataGb = resources.reduce(
    (total, r) => total + (r.kind === "nat" ? r.dataGb : 0),
    0,
  );
  if (natDataGb > 1000) {
    insights.push({
      id: "nat-endpoint",
      title: "S3 · DynamoDB Gateway 엔드포인트 활용",
      body: "NAT Gateway를 거치는 트래픽을 VPC 엔드포인트로 우회하면 GB당 처리 요금을 없앨 수 있습니다.",
      savingsUsd: natDataGb * 0.4 * (getRegion(pricing, resources[0]?.regionId ?? "ap-northeast-2").nat.perGb?.price ?? 0),
      tone: "emerald",
    });
  }

  const transferCost = sum(
    resources.filter((r) => r.kind === "dataTransfer"),
    pricing,
  );
  if (transferCost > 0) {
    insights.push({
      id: "cloudfront",
      title: "CloudFront · 프라이빗 요금제 검토",
      body: "반복적인 대용량 아웃바운드는 CloudFront 전송이나 AWS 프라이빗 요금제로 단가를 낮출 수 있습니다.",
      savingsUsd: transferCost * 0.15,
      tone: "amber",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "start",
      title: "리소스를 추가하면 절감 기회를 찾아드립니다",
      body: "EC2 가동률, S3 수명 주기, NAT 트래픽을 분석해 월별 절감 가능액을 자동으로 계산합니다.",
      savingsUsd: 0,
      tone: "emerald",
    });
  }

  return insights.sort((a, b) => b.savingsUsd - a.savingsUsd).slice(0, 3);
}

export function totalPotentialSavings(insights: Insight[]): number {
  return insights.reduce((total, insight) => total + insight.savingsUsd, 0);
}
