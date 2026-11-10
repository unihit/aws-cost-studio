import {
  ArrowLeftRight,
  Boxes,
  Cloud,
  Container,
  Cpu,
  Database,
  GitMerge,
  Globe,
  HardDrive,
  Layers,
  Lock,
  Network,
  Server,
  Sparkles,
  Table2,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { Category, EnvTag, PurchaseOption, ServiceKind, SupportPlan } from "../types";

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
    title: "Amazon RDS & Aurora",
    eyebrow: "Managed database",
    description: "PostgreSQL · MySQL, Aurora Serverless v2(ACU), Multi-AZ와 gp3/io2 스토리지 요율을 한 번에.",
    icon: Database,
    category: "database",
    accent: "text-indigo-500",
    tile: "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20",
  },
  dynamodb: {
    kind: "dynamodb",
    title: "Amazon DynamoDB",
    eyebrow: "NoSQL Serverless DB",
    description: "On-Demand(WRU/RRU 50% 인하 반영) · 프로비저닝(WCU/RCU) 용량과 스토리지를 계산합니다.",
    icon: Table2,
    category: "database",
    accent: "text-blue-600",
    tile: "bg-blue-600/10 text-blue-600 ring-blue-600/20",
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
  tgw: {
    kind: "tgw",
    title: "AWS Transit Gateway",
    eyebrow: "Enterprise Hub Router",
    description: "멀티 VPC·온프레미스 연결 어태치먼트 시간당 요금과 라우팅 데이터 처리(GB) 비용을 계산합니다.",
    icon: GitMerge,
    category: "network",
    accent: "text-purple-500",
    tile: "bg-purple-500/10 text-purple-500 ring-purple-500/20",
  },
  vpn: {
    kind: "vpn",
    title: "AWS Site-to-Site VPN",
    eyebrow: "Hybrid IPsec VPN",
    description: "온프레미스/IDC 연동 IPsec VPN 연결 시간당 요금($0.05/h), 가속 옵션, 아웃바운드 트래픽을 계산합니다.",
    icon: Lock,
    category: "network",
    accent: "text-lime-600",
    tile: "bg-lime-500/10 text-lime-600 ring-lime-500/20",
  },
  bedrock: {
    kind: "bedrock",
    title: "Amazon Bedrock",
    eyebrow: "Generative AI",
    description: "Claude 3.5 Sonnet/Haiku, Llama, Titan 등 주요 파운데이션 모델의 월간 입출력 토큰 비용을 계산합니다.",
    icon: Sparkles,
    category: "compute",
    accent: "text-fuchsia-500",
    tile: "bg-fuchsia-500/10 text-fuchsia-500 ring-fuchsia-500/20",
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

export interface BedrockModelSpec {
  id: string;
  name: string;
  provider: "Anthropic" | "Meta" | "Amazon";
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  description: string;
}

export const BEDROCK_MODELS: Record<string, BedrockModelSpec> = {
  "anthropic.claude-3-5-sonnet": {
    id: "anthropic.claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    inputPerMillionUsd: 3.0,
    outputPerMillionUsd: 15.0,
    description: "업계 최고 성능 코딩·에이전트·복합 추론 ($3.00 / $15.00 per 1M)",
  },
  "anthropic.claude-3-5-haiku": {
    id: "anthropic.claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    inputPerMillionUsd: 0.8,
    outputPerMillionUsd: 4.0,
    description: "초고속 응답 속도와 뛰어난 가성비 ($0.80 / $4.00 per 1M)",
  },
  "anthropic.claude-3-opus": {
    id: "anthropic.claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    inputPerMillionUsd: 15.0,
    outputPerMillionUsd: 75.0,
    description: "심층 분석·복잡한 고난도 추론 작업용 ($15.00 / $75.00 per 1M)",
  },
  "meta.llama-3-3-70b": {
    id: "meta.llama-3-3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    inputPerMillionUsd: 0.72,
    outputPerMillionUsd: 0.72,
    description: "최신 오픈 가중치 고성능 플래그십 ($0.72 / $0.72 per 1M)",
  },
  "meta.llama-3-1-8b": {
    id: "meta.llama-3-1-8b",
    name: "Llama 3.1 8B",
    provider: "Meta",
    inputPerMillionUsd: 0.22,
    outputPerMillionUsd: 0.22,
    description: "초저비용 경량 실시간 서빙 모델 ($0.22 / $0.22 per 1M)",
  },
  "amazon.titan-text-express": {
    id: "amazon.titan-text-express",
    name: "Titan Text Express",
    provider: "Amazon",
    inputPerMillionUsd: 0.2,
    outputPerMillionUsd: 0.6,
    description: "텍스트 요약, 질의응답용 가성비 모델 ($0.20 / $0.60 per 1M)",
  },
  "amazon.titan-embed-text": {
    id: "amazon.titan-embed-text",
    name: "Titan Embeddings G1",
    provider: "Amazon",
    inputPerMillionUsd: 0.02,
    outputPerMillionUsd: 0.0,
    description: "RAG 검색 및 벡터 임베딩 생성 ($0.02 per 1M)",
  },
};

export const SERVICE_ORDER: ServiceKind[] = [
  "ec2",
  "ecs",
  "bedrock",
  "rds",
  "dynamodb",
  "elasticache",
  "s3",
  "ebs",
  "lambda",
  "eks",
  "cloudfront",
  "alb",
  "nat",
  "tgw",
  "vpn",
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
  dynamodb: "#2563eb",
  elasticache: "#d946ef",
  s3: "#10b981",
  lambda: "#f97316",
  eks: "#3b82f6",
  ecs: "#ec4899",
  bedrock: "#c026d3",
  cloudfront: "#14b8a6",
  nat: "#8b5cf6",
  alb: "#f43f5e",
  tgw: "#a855f7",
  vpn: "#65a30d",
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

export const SUPPORT_PLANS: {
  value: SupportPlan;
  label: string;
  shortLabel: string;
  hint: string;
}[] = [
  { value: "basic", label: "Basic Support (무료)", shortLabel: "Basic (무료)", hint: "기본 지원 · 추가 비용 없음" },
  { value: "developer", label: "Developer Support", shortLabel: "Dev (3%)", hint: "월 최소 $29 또는 사용량의 3%" },
  { value: "business", label: "Business Support", shortLabel: "Biz (10%~)", hint: "월 최소 $100 또는 구간별 10%~3%" },
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
