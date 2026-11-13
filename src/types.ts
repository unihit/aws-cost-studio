export type ServiceKind =
  | "ec2"
  | "ebs"
  | "rds"
  | "s3"
  | "nat"
  | "alb"
  | "dataTransfer"
  | "elasticache"
  | "cloudfront"
  | "lambda"
  | "eks"
  | "ecs"
  | "dynamodb"
  | "tgw"
  | "vpn"
  | "bedrock";

export type Category = "compute" | "database" | "storage" | "network";

export type Currency = "USD" | "KRW";

export type PurchaseOption = "onDemand" | "sp1yr" | "sp3yr";

export type SupportPlan = "basic" | "developer" | "business";

export type ResourceSort = "created" | "costDesc" | "costAsc" | "name";

export type EnvTag = "prod" | "stage" | "dev";

export type EbsVolumeType = "gp3" | "gp2" | "io1" | "io2" | "st1" | "sc1";
export type RdsStorageType = "gp3" | "gp2" | "io1" | "io2";
export type S3Class =
  | "standard"
  | "standardIA"
  | "onezoneIA"
  | "glacierIR"
  | "glacierFlexible"
  | "deepArchive";

export interface BaseResource {
  id: string;
  kind: ServiceKind;
  regionId: string;
  createdAt: number;
  label?: string;
  env?: EnvTag;
}

export interface Ec2Resource extends BaseResource {
  kind: "ec2";
  instanceType: string;
  qty: number;
  utilization: number;
}

export interface EbsResource extends BaseResource {
  kind: "ebs";
  volumeType: EbsVolumeType;
  sizeGb: number;
  iops: number;
  throughput: number;
  qty: number;
}

export interface RdsResource extends BaseResource {
  kind: "rds";
  engine: "postgres" | "mysql";
  deploymentMode?: "instance" | "serverlessV2";
  acu?: number;
  instanceType: string;
  multiAz: boolean;
  storageGb: number;
  storageType: RdsStorageType;
  iops: number;
  throughput?: number;
  qty: number;
}

export interface S3Resource extends BaseResource {
  kind: "s3";
  storageClass: S3Class;
  storageGb: number;
  putRequests: number;
  getRequests: number;
  retrievalGb: number;
}

export interface NatResource extends BaseResource {
  kind: "nat";
  qty: number;
  hours: number;
  dataGb: number;
}

export type LoadBalancerType = "alb" | "nlb";

export interface AlbResource extends BaseResource {
  kind: "alb";
  lbType?: LoadBalancerType;
  qty: number;
  hours: number;
  lcu: number;
}

export interface DataTransferResource extends BaseResource {
  kind: "dataTransfer";
  gbOut: number;
}

export interface ElastiCacheResource extends BaseResource {
  kind: "elasticache";
  engine: "valkey" | "redis";
  nodeType: string;
  qty: number;
  replicas: number;
  backupGb: number;
}

export interface CloudFrontResource extends BaseResource {
  kind: "cloudfront";
  gbOut: number;
  httpsRequests: number;
}

export interface LambdaResource extends BaseResource {
  kind: "lambda";
  arch: "arm64" | "x86";
  memoryMb: number;
  durationMs: number;
  invocations: number;
  includeFreeTier: boolean;
  apiGatewayRequests: number;
}

export interface EksResource extends BaseResource {
  kind: "eks";
  clusters: number;
  extendedSupport: boolean;
  workerInstanceType: string;
  workerQty: number;
}

export interface EcsResource extends BaseResource {
  kind: "ecs";
  arch: "arm64" | "x86";
  launchType: "fargate" | "fargateSpot";
  qty: number;
  hours: number;
  vcpu: number;
  memoryGb: number;
  ephemeralStorageGb: number;
}

export interface DynamoDbResource extends BaseResource {
  kind: "dynamodb";
  capacityMode: "onDemand" | "provisioned";
  storageGb: number;
  readUnits: number;
  writeUnits: number;
  includeFreeTier: boolean;
}

export interface TgwResource extends BaseResource {
  kind: "tgw";
  qty: number;
  hours: number;
  dataProcessedGb: number;
}

export interface VpnResource extends BaseResource {
  kind: "vpn";
  qty: number;
  hours: number;
  accelerated: boolean;
  dataOutGb: number;
}

export type BedrockInferenceMode = "global" | "geo";

export interface BedrockResource extends BaseResource {
  kind: "bedrock";
  modelId: string;
  inferenceMode?: BedrockInferenceMode;
  monthlyInputTokensM: number;
  monthlyOutputTokensM: number;
}

export type Resource =
  | Ec2Resource
  | EbsResource
  | RdsResource
  | S3Resource
  | NatResource
  | AlbResource
  | DataTransferResource
  | ElastiCacheResource
  | CloudFrontResource
  | LambdaResource
  | EksResource
  | EcsResource
  | DynamoDbResource
  | TgwResource
  | VpnResource
  | BedrockResource;

export interface Rate {
  price: number;
  rateCode?: string;
  key?: string;
}

export interface Ec2Rate extends Rate {
  vcpu: number;
  mem: number;
  family: string;
}

export interface RdsInstanceRate {
  single: number;
  multi: number;
  vcpu: number;
  mem: number;
  rateCode?: string;
}

export interface RdsStorageRate {
  single: Rate | null;
  multi: Rate | null;
}

export interface RdsEnginePricing {
  instance: Record<string, RdsInstanceRate>;
  storage: {
    gp3: RdsStorageRate;
    gp2: RdsStorageRate;
    io1: RdsStorageRate;
    io2: RdsStorageRate;
    iops: RdsStorageRate;
    gp3Iops: RdsStorageRate;
    throughput: RdsStorageRate;
    backup: Rate | null;
  };
}

export interface S3ClassRate {
  storage: Rate | null;
  put: Rate | null;
  get: Rate | null;
  retrieval?: Rate | null;
}

export interface S3Pricing {
  standard: {
    tiers: (Rate | null)[];
    put: Rate | null;
    get: Rate | null;
  };
  standardIA: S3ClassRate;
  onezoneIA: S3ClassRate;
  glacierIR: S3ClassRate;
  glacierFlexible: S3ClassRate;
  deepArchive: S3ClassRate;
}

export interface RegionPricing {
  id: string;
  label: string;
  awsName: string;
  flag: string;
  short: string;
  ec2: Record<string, Ec2Rate>;
  ebs: {
    gp3: Rate | null;
    gp2: Rate | null;
    io1: Rate | null;
    io2: Rate | null;
    st1: Rate | null;
    sc1: Rate | null;
    standard: Rate | null;
    snapshot: Rate | null;
    gp3Iops: Rate | null;
    gp3ThroughputPerMBps: Rate | null;
    io1Iops: Rate | null;
    io2IopsTier1: Rate | null;
    io2IopsTier2: Rate | null;
    io2IopsTier3: Rate | null;
    freeIops: number;
    freeThroughputMBps: number;
  };
  rds: Record<"postgres" | "mysql", RdsEnginePricing>;
  s3: S3Pricing;
  nat: { hourly: Rate | null; perGb: Rate | null };
  alb: { hourly: Rate | null; lcu: Rate | null };
  dataTransfer: { upToTb: number | null; price: number; rateCode?: string }[];
}

export interface PricingMeta {
  generatedAt: string;
  currency: string;
  hoursPerMonth: number;
  gbPerTb: number;
  fxKrwPerUsd: number;
  regions: { id: string; label: string; awsName: string; flag: string; short: string }[];
  sources: Record<string, string>;
  formulas: Record<string, string>;
}

export interface PricingData {
  meta: PricingMeta;
  regions: RegionPricing[];
}

export interface CostLine {
  id: string;
  kind: ServiceKind;
  label: string;
  customLabel?: string;
  env?: EnvTag;
  regionId: string;
  monthlyUsd: number;
  category: Category;
  detail: string;
}

export interface CostSummary {
  lines: CostLine[];
  subtotalUsd: number;
  supportUsd: number;
  vatUsd: number;
  monthlyUsd: number;
  annualUsd: number;
  onDemandMonthlyUsd: number;
  byKind: Record<ServiceKind, number>;
  byCategory: Record<Category, number>;
}
