import {
  ArrowLeftRight,
  Boxes,
  Cloud,
  Container,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  Network,
  Server,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { Category, EnvTag, PurchaseOption, ServiceKind } from "../types";

export interface ServiceMeta {
  kind: ServiceKind;
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  category: Category;
  accent: string;
  tile: string;
}

export const SERVICES: Record<ServiceKind, ServiceMeta> = {
  ec2: {
    kind: "ec2",
    title: "Amazon EC2",
    eyebrow: "Compute",
    description: "인스턴스 패밀리와 가동률만으로 컴퓨트 비용을 즉시 산출합니다.",
    icon: Server,
    category: "compute",
    accent: "text-amber-500",
    tile: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  },
  ebs: {
    kind: "ebs",
    title: "Amazon EBS",
    eyebrow: "Block storage",
    description: "gp3 · io2 볼륨과 IOPS/처리량 할증을 정확히 반영합니다.",
    icon: HardDrive,
    category: "storage",
    accent: "text-sky-500",
    tile: "bg-sky-500/10 text-sky-500 ring-sky-500/20",
  },
  rds: {
    kind: "rds",
    title: "Amazon RDS",
    eyebrow: "Managed database",
    description: "PostgreSQL · MySQL, Multi-AZ와 gp3/io2 스토리지 요율을 한 번에.",
    icon: Database,
    category: "database",
    accent: "text-indigo-500",
    tile: "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20",
  },
  elasticache: {
    kind: "elasticache",
    title: "Amazon ElastiCache",
    eyebrow: "In-memory cache",
    description: "Valkey(20% 할인) · Redis 인메모리 캐시 노드와 복제본 구성을 계산합니다.",
    icon: Layers,
    category: "database",
    accent: "text-fuchsia-500",
    tile: "bg-fuchsia-500/10 text-fuchsia-500 ring-fuchsia-500/20",
  },
  s3: {
    kind: "s3",
    title: "Amazon S3",
    eyebrow: "Object storage",
    description: "스토리지 클래스별 계단식 요율과 요청 비용을 계산합니다.",
    icon: Cloud,
    category: "storage",
    accent: "text-emerald-500",
    tile: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  },
  lambda: {
    kind: "lambda",
    title: "AWS Lambda & API GW",
    eyebrow: "Serverless",
    description: "Arm64/x86 함수 실행(GB-s), 프리티어 공제, HTTP API Gateway 요청을 합산합니다.",
    icon: Cpu,
    category: "compute",
    accent: "text-orange-500",
    tile: "bg-orange-500/10 text-orange-500 ring-orange-500/20",
  },
  eks: {
    kind: "eks",
    title: "Amazon EKS",
    eyebrow: "Kubernetes",
    description: "클러스터 컨트롤 플레인 고정비($0.10/h)와 관리형 워커 노드를 함께 산출합니다.",
    icon: Boxes,
    category: "compute",
    accent: "text-blue-500",
    tile: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  },
  ecs: {
    kind: "ecs",
    title: "Amazon ECS (Fargate)",
    eyebrow: "Serverless container",
    description: "AWS Fargate 태스크(vCPU·메모리), Arm64(Graviton), Fargate Spot 요율을 계산합니다.",
    icon: Container,
    category: "compute",
    accent: "text-pink-500",
    tile: "bg-pink-500/10 text-pink-500 ring-pink-500/20",
  },
  cloudfront: {
    kind: "cloudfront",
    title: "Amazon CloudFront",
    eyebrow: "Edge CDN",
    description: "글로벌 엣지 아웃바운드 데이터 전송과 HTTPS 요청 단가를 반영합니다.",
    icon: Globe,
    category: "network",
    accent: "text-teal-500",
    tile: "bg-teal-500/10 text-teal-500 ring-teal-500/20",
  },
  nat: {
    kind: "nat",
    title: "NAT Gateway",
    eyebrow: "Networking",
    description: "시간당 요금과 처리한 데이터 GB당 요금을 함께 계산합니다.",
    icon: Waypoints,
    category: "network",
    accent: "text-violet-500",
    tile: "bg-violet-500/10 text-violet-500 ring-violet-500/20",
  },
  alb: {
    kind: "alb",
    title: "Elastic Load Balancing",
    eyebrow: "Networking (ALB / NLB)",
    description: "Application Load Balancer(L7) 및 고성능 Network Load Balancer(L4) 요금을 통합 계산합니다.",
    icon: Network,
    category: "network",
    accent: "text-rose-500",
    tile: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
  },
  dataTransfer: {
    kind: "dataTransfer",
    title: "Data Transfer",
    eyebrow: "Networking",
    description: "인터넷 아웃바운드 10TB / 40TB / 100TB 구간 요율을 적용합니다.",
    icon: ArrowLeftRight,
    category: "network",
    accent: "text-cyan-500",
    tile: "bg-cyan-500/10 text-cyan-500 ring-cyan-500/20",
  },
};

export const SERVICE_ORDER: ServiceKind[] = [
  "ec2",
  "ecs",
  "rds",
  "elasticache",
  "s3",
  "ebs",
  "lambda",
  "eks",
  "cloudfront",
  "alb",
  "nat",
  "dataTransfer",
];

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  compute: { label: "Compute", color: "#f59e0b" },
  database: { label: "Database", color: "#6366f1" },
  storage: { label: "Storage", color: "#10b981" },
  network: { label: "Network", color: "#06b6d4" },
};

export const SERVICE_COLORS: Record<ServiceKind, string> = {
  ec2: "#f59e0b",
  ebs: "#0ea5e9",
  rds: "#6366f1",
  elasticache: "#d946ef",
  s3: "#10b981",
  lambda: "#f97316",
  eks: "#3b82f6",
  ecs: "#ec4899",
  cloudfront: "#14b8a6",
  nat: "#8b5cf6",
  alb: "#f43f5e",
  dataTransfer: "#06b6d4",
};

export const PURCHASE_OPTIONS: {
  value: PurchaseOption;
  label: string;
  shortLabel: string;
  discountText: string;
}[] = [
  { value: "onDemand", label: "On-Demand (정가)", shortLabel: "On-Demand", discountText: "약정 없음" },
  { value: "sp1yr", label: "1년 약정 (SP/RI)", shortLabel: "1yr SP/RI", discountText: "컴퓨트·DB 최대 28%↓" },
  { value: "sp3yr", label: "3년 약정 (SP/RI)", shortLabel: "3yr SP/RI", discountText: "컴퓨트·DB 최대 48%↓" },
];

export const ENV_META: Record<EnvTag, { label: string; badgeClass: string }> = {
  prod: {
    label: "PROD",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  stage: {
    label: "STAGE",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  dev: {
    label: "DEV",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};
