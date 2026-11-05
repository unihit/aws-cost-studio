import { Bot, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Resource } from "../types";

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

interface Base {
  id: string;
  regionId: string;
  createdAt: number;
}

const base = (regionId: string, createdAt: number): Base => ({
  id: uid(),
  regionId,
  createdAt,
});

export interface Preset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  build: (regionId: string) => Resource[];
}

export const PRESETS: Preset[] = [
  {
    id: "startup",
    title: "스타트업 MVP 스택",
    subtitle: "2× EC2 · RDS · S3 · ALB",
    description: "초기 트래픽에 맞춘 가성비 구성. Graviton 인스턴스와 단일 AZ 데이터베이스.",
    icon: Rocket,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    build: (regionId) => {
      const t = Date.now();
      return [
        {
          ...base(regionId, t),
          kind: "ec2",
          instanceType: "t4g.small",
          qty: 2,
          utilization: 70,
        },
        {
          ...base(regionId, t + 1),
          kind: "rds",
          engine: "postgres",
          instanceType: "db.t4g.micro",
          multiAz: false,
          storageGb: 20,
          storageType: "gp3",
          iops: 3000,
          qty: 1,
        },
        {
          ...base(regionId, t + 2),
          kind: "s3",
          storageClass: "standard",
          storageGb: 50,
          putRequests: 250_000,
          getRequests: 1_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 3),
          kind: "alb",
          qty: 1,
          hours: 730,
          lcu: 1,
        },
      ];
    },
  },
  {
    id: "ha-web",
    title: "고가용성 프로덕션 웹",
    subtitle: "Multi-AZ · 2× NAT · 4× EC2",
    description: "무중단 배포와 장애 격리를 위한 이중화 구성. Multi-AZ RDS와 이중 NAT Gateway.",
    icon: ShieldCheck,
    gradient: "from-indigo-500/25 via-violet-500/10 to-transparent",
    build: (regionId) => {
      const t = Date.now();
      return [
        {
          ...base(regionId, t),
          kind: "ec2",
          instanceType: "m6i.large",
          qty: 4,
          utilization: 100,
        },
        {
          ...base(regionId, t + 1),
          kind: "rds",
          engine: "postgres",
          instanceType: "db.r6g.large",
          multiAz: true,
          storageGb: 200,
          storageType: "gp3",
          iops: 3000,
          qty: 1,
        },
        {
          ...base(regionId, t + 2),
          kind: "alb",
          qty: 2,
          hours: 730,
          lcu: 5,
        },
        {
          ...base(regionId, t + 3),
          kind: "nat",
          qty: 2,
          hours: 730,
          dataGb: 2_000,
        },
        {
          ...base(regionId, t + 4),
          kind: "s3",
          storageClass: "standard",
          storageGb: 500,
          putRequests: 2_000_000,
          getRequests: 10_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 5),
          kind: "dataTransfer",
          gbOut: 2 * 1024,
        },
      ];
    },
  },
  {
    id: "ai-cluster",
    title: "AI 서빙 클러스터",
    subtitle: "2× g5.2xlarge · 고성능 EBS",
    description: "GPU 추론 워크로드에 맞춘 구성. 모델 캐시용 고IOPS 볼륨과 대용량 오브젝트 스토리지.",
    icon: Bot,
    gradient: "from-amber-500/25 via-orange-500/10 to-transparent",
    build: (regionId) => {
      const t = Date.now();
      return [
        {
          ...base(regionId, t),
          kind: "ec2",
          instanceType: "g5.2xlarge",
          qty: 2,
          utilization: 60,
        },
        {
          ...base(regionId, t + 1),
          kind: "ec2",
          instanceType: "g5.xlarge",
          qty: 1,
          utilization: 40,
        },
        {
          ...base(regionId, t + 2),
          kind: "ebs",
          volumeType: "gp3",
          sizeGb: 1_000,
          iops: 6_000,
          throughput: 500,
          qty: 3,
        },
        {
          ...base(regionId, t + 3),
          kind: "s3",
          storageClass: "standard",
          storageGb: 2_048,
          putRequests: 500_000,
          getRequests: 8_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 4),
          kind: "dataTransfer",
          gbOut: 1 * 1024,
        },
      ];
    },
  },
];

export function presetTotal(
  preset: Preset,
  regionId: string,
  calculate: (resource: Resource) => number,
): number {
  return preset.build(regionId).reduce((sum, resource) => sum + calculate(resource), 0);
}
