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
    description: "Claude 5.5/4.6, GPT-6/gpt-oss 파운데이션 모델의 월간 입출력 토큰 및 CRIS 라우팅 비용을 계산합니다.",
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
  provider: "Anthropic" | "OpenAI";
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  pricingScope: "cris" | "regional";
  geoMultiplier?: number;
  regionalRates?: Record<string, { input: number; output: number }>;
  description: string;
  badge?: string;
}

export const DEFAULT_BEDROCK_MODEL_ID = "anthropic.claude-5-5-sonnet";

export const BEDROCK_MODELS: Record<string, BedrockModelSpec> = {
  // === Anthropic Claude 라인업 (Global / Geo CRIS) ===
  "anthropic.claude-fable-5-2": {
    id: "anthropic.claude-fable-5-2",
    name: "Claude Fable 5.2",
    provider: "Anthropic",
    inputPerMillionUsd: 8.0,
    outputPerMillionUsd: 40.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "장문 서사·복합 기획·고난도 에이전트 플래그십 ($8.00 / $40.00 per 1M · Global CRIS)",
    badge: "Fable 5.2",
  },
  "anthropic.claude-5-5-opus": {
    id: "anthropic.claude-5-5-opus",
    name: "Claude Opus 5.5",
    provider: "Anthropic",
    inputPerMillionUsd: 4.0,
    outputPerMillionUsd: 20.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "최고 지능 복합 심층 추론 및 시스템 설계 플래그십 ($4.00 / $20.00 per 1M · Global CRIS)",
    badge: "최고 지능",
  },
  "anthropic.claude-5-5-sonnet": {
    id: "anthropic.claude-5-5-sonnet",
    name: "Claude Sonnet 5.5",
    provider: "Anthropic",
    inputPerMillionUsd: 2.0,
    outputPerMillionUsd: 10.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "주력 플래그십 · 고성능 코딩 및 자율 에이전트 ($2.00 / $10.00 per 1M · Global CRIS)",
    badge: "주력 추천",
  },
  "anthropic.claude-5-5-haiku": {
    id: "anthropic.claude-5-5-haiku",
    name: "Claude Haiku 5.5",
    provider: "Anthropic",
    inputPerMillionUsd: 0.1,
    outputPerMillionUsd: 0.5,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "초고속 실시간 스트리밍 & 초경량 모델 (≤100K 기준 $0.10 / $0.50 per 1M · Global CRIS)",
    badge: "초고속 ≤100K",
  },
  "anthropic.claude-4-6-sonnet": {
    id: "anthropic.claude-4-6-sonnet",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    inputPerMillionUsd: 3.0,
    outputPerMillionUsd: 15.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "검증된 프로덕션 균형형 코딩·분석 모델 ($3.00 / $15.00 per 1M · Global CRIS)",
  },
  "anthropic.claude-4-5-haiku": {
    id: "anthropic.claude-4-5-haiku",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputPerMillionUsd: 1.0,
    outputPerMillionUsd: 5.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "저지연 경량 분류·요약·툴 호출 모델 ($1.00 / $5.00 per 1M · Global CRIS)",
  },

  // === OpenAI GPT-6 (CRIS) & Open-Weight (Regional) 라인업 ===
  "openai.gpt-6-astra": {
    id: "openai.gpt-6-astra",
    name: "GPT-6 Astra",
    provider: "OpenAI",
    inputPerMillionUsd: 10.0,
    outputPerMillionUsd: 50.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "프론티어 최상위 복합 추론 & 에이전트 플래그십 ($10.00 / $50.00 per 1M · Global CRIS)",
    badge: "Astra 플래그십",
  },
  "openai.gpt-6-1-sol": {
    id: "openai.gpt-6-1-sol",
    name: "GPT-6.1 Sol",
    provider: "OpenAI",
    inputPerMillionUsd: 2.0,
    outputPerMillionUsd: 10.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "차세대 주력 자율 추론 & 멀티모달 ($2.00 / $10.00 per 1M · Global CRIS)",
    badge: "Sol 주력",
  },
  "openai.gpt-6-1-terra": {
    id: "openai.gpt-6-1-terra",
    name: "GPT-6.1 Terra",
    provider: "OpenAI",
    inputPerMillionUsd: 1.0,
    outputPerMillionUsd: 5.0,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "고효율 엔터프라이즈 추론 및 대량 파이프라인 ($1.00 / $5.00 per 1M · Global CRIS)",
    badge: "Terra 효율",
  },
  "openai.gpt-6-luna": {
    id: "openai.gpt-6-luna",
    name: "GPT-6 Luna",
    provider: "OpenAI",
    inputPerMillionUsd: 0.1,
    outputPerMillionUsd: 0.5,
    pricingScope: "cris",
    geoMultiplier: 1.1,
    description: "초저비용 실시간 라우팅·경량 대화 에이전트 ($0.10 / $0.50 per 1M · Global CRIS)",
    badge: "Luna 초경량",
  },
  "openai.gpt-oss-120b": {
    id: "openai.gpt-oss-120b",
    name: "OpenAI gpt-oss-120b",
    provider: "OpenAI",
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.6,
    pricingScope: "regional",
    regionalRates: {
      "us-east-1": { input: 0.15, output: 0.6 },
      "us-west-2": { input: 0.15, output: 0.6 },
      "ap-northeast-1": { input: 0.18, output: 0.73 },
      "eu-west-1": { input: 0.18, output: 0.7 },
      "eu-central-1": { input: 0.2, output: 0.79 },
    },
    description: "고성능 Open-Weight 120B 모델 · 리전별 온디맨드 단가 (기본 US $0.15 / $0.60 per 1M)",
    badge: "Open-Weight",
  },
  "openai.gpt-oss-20b": {
    id: "openai.gpt-oss-20b",
    name: "OpenAI gpt-oss-20b",
    provider: "OpenAI",
    inputPerMillionUsd: 0.07,
    outputPerMillionUsd: 0.3,
    pricingScope: "regional",
    regionalRates: {
      "us-east-1": { input: 0.07, output: 0.3 },
      "us-west-2": { input: 0.07, output: 0.3 },
      "ap-northeast-1": { input: 0.08, output: 0.36 },
      "eu-west-1": { input: 0.08, output: 0.35 },
      "eu-central-1": { input: 0.09, output: 0.4 },
    },
    description: "초경량 Open-Weight 20B 모델 · 리전별 온디맨드 단가 (기본 US $0.07 / $0.30 per 1M)",
    badge: "Open-Weight",
  },
};

export const BEDROCK_MODEL_ALIASES: Record<string, string> = {
  "anthropic.claude-3-5-sonnet": "anthropic.claude-4-6-sonnet",
  "anthropic.claude-3-5-sonnet-v2": "anthropic.claude-4-6-sonnet",
  "anthropic.claude-3-7-sonnet": "anthropic.claude-4-6-sonnet",
  "anthropic.claude-3-5-haiku": "anthropic.claude-4-5-haiku",
  "anthropic.claude-3-opus": "anthropic.claude-5-5-opus",
  "openai.gpt-4o": "openai.gpt-6-1-sol",
  "openai.gpt-4o-mini": "openai.gpt-6-luna",
  "openai.gpt-5-2-omni": "openai.gpt-6-1-sol",
  "openai.gpt-5-2-mini": "openai.gpt-6-luna",
  "openai.gpt-5-o3": "openai.gpt-6-1-terra",
  "amazon.nova-pro": DEFAULT_BEDROCK_MODEL_ID,
  "amazon.nova-lite": "anthropic.claude-5-5-haiku",
  "amazon.nova-micro": "anthropic.claude-5-5-haiku",
  "amazon.titan-text-premier": DEFAULT_BEDROCK_MODEL_ID,
  "amazon.titan-text-express": "anthropic.claude-5-5-haiku",
  "amazon.titan-embed-text-v2": "anthropic.claude-5-5-haiku",
  "amazon.titan-embed-text": "anthropic.claude-5-5-haiku",
  "meta.llama-3-3-70b": DEFAULT_BEDROCK_MODEL_ID,
  "meta.llama-3-2-11b": "anthropic.claude-5-5-haiku",
  "meta.llama-3-2-3b": "anthropic.claude-5-5-haiku",
  "meta.llama-3-2-1b": "anthropic.claude-5-5-haiku",
  "meta.llama-3-1-405b": "anthropic.claude-5-5-opus",
  "meta.llama-3-1-8b": "anthropic.claude-5-5-haiku",
  "mistral.mistral-large-2": DEFAULT_BEDROCK_MODEL_ID,
  "cohere.command-r-plus": DEFAULT_BEDROCK_MODEL_ID,
  "cohere.command-r": "anthropic.claude-5-5-haiku",
};

export function resolveBedrockModel(modelId?: string): BedrockModelSpec {
  if (modelId) {
    if (BEDROCK_MODELS[modelId]) return BEDROCK_MODELS[modelId];
    const aliased = BEDROCK_MODEL_ALIASES[modelId];
    if (aliased && BEDROCK_MODELS[aliased]) return BEDROCK_MODELS[aliased];
  }
  return BEDROCK_MODELS[DEFAULT_BEDROCK_MODEL_ID];
}

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
