import { Bot, Cpu, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import type { EnvTag, Resource } from "../types";

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

interface Base {
  id: string;
  regionId: string;
  createdAt: number;
  label?: string;
  env?: EnvTag;
}

const base = (regionId: string, createdAt: number, label?: string, env: EnvTag = "prod"): Base => ({
  id: uid(),
  regionId,
  createdAt,
  label,
  env,
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
          ...base(regionId, t, "웹/API 서버", "prod"),
          kind: "ec2",
          instanceType: "t4g.small",
          qty: 2,
          utilization: 70,
        },
        {
          ...base(regionId, t + 1, "메인 DB (단일 AZ)", "prod"),
          kind: "rds",
          engine: "postgres",
          instanceType: "db.t4g.micro",
          multiAz: false,
          storageGb: 20,
          storageType: "gp3",
          iops: 3000,
          throughput: 125,
          qty: 1,
        },
        {
          ...base(regionId, t + 2, "미디어/정적 파일 버킷", "prod"),
          kind: "s3",
          storageClass: "standard",
          storageGb: 50,
          putRequests: 250_000,
          getRequests: 1_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 3, "퍼블릭 인그레스 ALB", "prod"),
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
    subtitle: "Multi-AZ · ElastiCache · 2× NAT · 4× EC2",
    description: "무중단 배포와 장애 격리를 위한 이중화 구성. Multi-AZ RDS, Valkey 캐시, 이중 NAT.",
    icon: ShieldCheck,
    gradient: "from-indigo-500/25 via-violet-500/10 to-transparent",
    build: (regionId) => {
      const t = Date.now();
      return [
        {
          ...base(regionId, t, "애플리케이션 오토스케일링 그룹", "prod"),
          kind: "ec2",
          instanceType: "m6i.large",
          qty: 4,
          utilization: 100,
        },
        {
          ...base(regionId, t + 1, "운영 메인 DB (Multi-AZ)", "prod"),
          kind: "rds",
          engine: "postgres",
          instanceType: "db.r6g.large",
          multiAz: true,
          storageGb: 200,
          storageType: "gp3",
          iops: 3000,
          throughput: 125,
          qty: 1,
        },
        {
          ...base(regionId, t + 2, "세션 · 쿼리 캐시 클러스터", "prod"),
          kind: "elasticache",
          engine: "valkey",
          nodeType: "cache.r7g.large",
          qty: 1,
          replicas: 1,
          backupGb: 20,
        },
        {
          ...base(regionId, t + 3, "외부/내부 ALB", "prod"),
          kind: "alb",
          qty: 2,
          hours: 730,
          lcu: 5,
        },
        {
          ...base(regionId, t + 4, "AZ별 이중화 NAT Gateway", "prod"),
          kind: "nat",
          qty: 2,
          hours: 730,
          dataGb: 2_000,
        },
        {
          ...base(regionId, t + 5, "고객 업로드 & 백업 버킷", "prod"),
          kind: "s3",
          storageClass: "standard",
          storageGb: 500,
          putRequests: 2_000_000,
          getRequests: 10_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 6, "인터넷 아웃바운드 트래픽", "prod"),
          kind: "dataTransfer",
          gbOut: 2 * 1024,
        },
      ];
    },
  },
  {
    id: "serverless-k8s",
    title: "EKS & 서버리스 하이브리드",
    subtitle: "EKS · Lambda · CloudFront · RDS",
    description: "컨테이너 오케스트레이션(EKS)과 이벤트 기반 서버리스(Lambda), 글로벌 CDN 아키텍처.",
    icon: Cpu,
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
    build: (regionId) => {
      const t = Date.now();
      return [
        {
          ...base(regionId, t, "메인 마이크로서비스 EKS", "prod"),
          kind: "eks",
          clusters: 1,
          extendedSupport: false,
          workerInstanceType: "m6g.large",
          workerQty: 3,
        },
        {
          ...base(regionId, t + 1, "비동기 이벤트/웹훅 워커", "prod"),
          kind: "lambda",
          arch: "arm64",
          memoryMb: 512,
          durationMs: 150,
          invocations: 15_000_000,
          includeFreeTier: true,
          apiGatewayRequests: 15_000_000,
        },
        {
          ...base(regionId, t + 2, "글로벌 웹/API 엣지 CDN", "prod"),
          kind: "cloudfront",
          gbOut: 3072,
          httpsRequests: 50_000_000,
        },
        {
          ...base(regionId, t + 3, "마이크로서비스 공유 DB", "prod"),
          kind: "rds",
          engine: "postgres",
          instanceType: "db.m6g.large",
          multiAz: true,
          storageGb: 100,
          storageType: "gp3",
          iops: 3000,
          throughput: 125,
          qty: 1,
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
          ...base(regionId, t, "LLM 추론 메인 GPU 노드", "prod"),
          kind: "ec2",
          instanceType: "g5.2xlarge",
          qty: 2,
          utilization: 60,
        },
        {
          ...base(regionId, t + 1, "임베딩/전처리 GPU 워커", "stage"),
          kind: "ec2",
          instanceType: "g5.xlarge",
          qty: 1,
          utilization: 40,
        },
        {
          ...base(regionId, t + 2, "모델 웨이트 고속 NVMe/gp3", "prod"),
          kind: "ebs",
          volumeType: "gp3",
          sizeGb: 1_000,
          iops: 6_000,
          throughput: 500,
          qty: 3,
        },
        {
          ...base(regionId, t + 3, "학습 데이터셋 & 체크포인트 S3", "prod"),
          kind: "s3",
          storageClass: "standard",
          storageGb: 2_048,
          putRequests: 500_000,
          getRequests: 8_000_000,
          retrievalGb: 0,
        },
        {
          ...base(regionId, t + 4, "추론 API 응답 아웃바운드", "prod"),
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
